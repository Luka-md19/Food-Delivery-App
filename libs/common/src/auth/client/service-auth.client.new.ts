import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '@app/common/config/config.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ServiceTokenResponse } from '../interfaces/service-token-response.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Client for service authentication
 * Handles obtaining and refreshing service tokens from the auth service
 */
@Injectable()
export class ServiceAuthClient implements OnModuleInit {
  private readonly logger = new Logger(ServiceAuthClient.name);
  private serviceToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private serviceId: string;
  private serviceName: string;
  private servicePermissions: string[];
  private authServiceUrl: string;
  private apiKey: string;
  private retryCount: number = 0;
  private readonly maxRetries: number = 5;
  
  constructor(
    private readonly configService: AppConfigService,
    private readonly httpService: HttpService,
  ) {
    this.validateConfiguration();
  }
  
  /**
   * Initialize the service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing service auth client for ${this.serviceName}`);
    await this.obtainServiceToken();
  }
  
  /**
   * Get the current service token
   * @returns The current service token or null if not available
   */
  getServiceToken(): string | null {
    if (!this.serviceToken) {
      this.logger.warn('Service token requested but not yet available');
    } else if (this.isTokenExpired()) {
      this.logger.warn('Service token requested but expired, refreshing');
      // Trigger refresh but don't wait for it
      this.obtainServiceToken().catch((err: Error) => {
        this.logger.error(`Error refreshing token on demand: ${err.message}`, err.stack);
      });
    }
    
    return this.serviceToken;
  }
  
  /**
   * Validates if the required configuration is available
   * @private
   */
  private validateConfiguration(): void {
    // Generate or get a stable service ID
    this.serviceId = this.configService.get<string>('SERVICE_ID', uuidv4());
    
    // Get service name from environment
    this.serviceName = this.configService.get<string>('SERVICE_NAME');
    if (!this.serviceName) {
      throw new Error('SERVICE_NAME environment variable must be set');
    }
    
    // Parse service permissions
    this.servicePermissions = this.parseServicePermissions(
      this.configService.get<string>('SERVICE_PERMISSIONS', '')
    );
    
    // Get auth service URL
    let authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://auth:3000');
    
    // Docker network specific adjustments
    const useDocker = this.configService.get<string>('USE_DOCKER', 'false').toLowerCase() === 'true';
    if (useDocker) {
      // In Docker environment, ensure we're using the service name not IP
      if (!authServiceUrl.includes('//auth:')) {
        // Replace any IP or hostname with the container name
        const urlObj = new URL(authServiceUrl);
        urlObj.hostname = 'auth';
        authServiceUrl = urlObj.toString();
      }
    }
    
    this.authServiceUrl = authServiceUrl;
    this.logger.log(`Auth service URL configured as: ${this.authServiceUrl}`);
    
    // Get API key for service authentication
    this.apiKey = this.configService.get<string>('SERVICE_API_KEY');
    if (!this.apiKey) {
      throw new Error('SERVICE_API_KEY environment variable must be set');
    }
  }
  
  /**
   * Parse service permissions from environment string
   * @private
   */
  private parseServicePermissions(permissionsStr: string): string[] {
    if (!permissionsStr) {
      return [];
    }
    
    return permissionsStr.split(',').map((p: string) => p.trim()).filter((p: string) => p);
  }
  
  /**
   * Check if the current token is expired
   * @private
   */
  private isTokenExpired(): boolean {
    return !this.tokenExpiry || Date.now() >= this.tokenExpiry;
  }
  
  /**
   * Obtain a new service token from the auth service
   * @private
   */
  private async obtainServiceToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      this.logger.debug('Token refresh already in progress, skipping');
      return;
    }
    
    this.isRefreshing = true;
    
    try {
      this.logger.log(`Obtaining service token for ${this.serviceName}...`);
      this.logger.log(`Sending request to: ${this.authServiceUrl}/auth/service/token`);
      
      const response: AxiosResponse<ServiceTokenResponse> = await firstValueFrom(
        this.httpService.post<ServiceTokenResponse>(
          `${this.authServiceUrl}/auth/service/token`,
          {
            serviceId: this.serviceId,
            serviceName: this.serviceName,
            permissions: this.servicePermissions,
            apiKey: this.apiKey,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ).pipe(
          timeout(10000), // 10 second timeout
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to obtain service token: ${error.message}`, error.stack);
            throw error;
          })
        )
      );
      
      const { data } = response;
      
      this.serviceToken = data.accessToken;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
      this.retryCount = 0; // Reset retry count on success
      
      this.logger.log(`Service token obtained successfully, expires in ${data.expiresIn} seconds`);
      
      // Schedule token refresh at 80% of expiry time
      const refreshTime = Math.floor(data.expiresIn * 0.8) * 1000;
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      
      this.refreshTimer = setTimeout(() => {
        this.obtainServiceToken().catch((err: Error) => {
          this.logger.error(`Failed to refresh service token: ${err.message}`, err.stack);
        });
      }, refreshTime);
      
    } catch (error) {
      this.retryCount++;
      
      // Calculate exponential backoff with jitter
      const baseDelay = Math.min(30000, Math.pow(2, this.retryCount) * 1000);
      const jitter = Math.random() * 0.3 * baseDelay;
      const retryDelay = baseDelay + jitter;
      
      this.logger.error(
        `Error obtaining service token (attempt ${this.retryCount}/${this.maxRetries}): ${error.message}`,
        error instanceof Error ? error.stack : undefined
      );
      
      // Schedule a retry with exponential backoff
      setTimeout(() => {
        this.isRefreshing = false; // Reset flag to allow retry
        this.obtainServiceToken().catch((err: Error) => {
          this.logger.error(`Failed to retry service token: ${err.message}`, err.stack);
        });
      }, retryDelay);
    } finally {
      this.isRefreshing = false;
    }
  }
} 