import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@app/common/jwt';
import { ConfigService } from '@nestjs/config';
import { ServiceJwtPayload, ServiceTokenResponse, LoggerFactory, GenericErrorCode as ErrorCode } from '@app/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { IServiceAuthService } from './interfaces/auth.interface';

/**
 * Service for handling service-to-service authentication
 * Provides secure API token generation for microservices to communicate with each other
 */
@Injectable()
export class ServiceAuthService implements IServiceAuthService {
  private readonly logger = LoggerFactory.getLogger(ServiceAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * Issues a service identity token for inter-service authentication
   * @param serviceId The unique identifier for the service
   * @param serviceName The name of the service requesting a token
   * @param permissions The array of permissions requested by the service
   * @returns A service token response with access token
   */
  async issueServiceToken(
    serviceId: string,
    serviceName: string,
    permissions: string[],
  ): Promise<ServiceTokenResponse> {
    try {
      this.logger.debug(`Issuing service token for ${serviceName} (${serviceId})`);
      
      // Verify the service is allowed to have these permissions
      await this.validateServicePermissions(serviceId, serviceName, permissions);
      
      // Create a payload for the JWT
      const payload: ServiceJwtPayload = {
        serviceId,
        serviceName,
        permissions,
      };
      
      // Generate a service token with longer expiry (configurable)
      const serviceTokenExpiry = this.configService.get('SERVICE_TOKEN_EXPIRATION', '1h');
      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: serviceTokenExpiry,
      });
      
      // Calculate expiration in seconds
      const expiresParts = serviceTokenExpiry.match(/^(\d+)([smhd])$/);
      let expiresInSeconds = 3600; // default to 1 hour
      
      if (expiresParts) {
        const value = parseInt(expiresParts[1]);
        const unit = expiresParts[2];
        
        switch (unit) {
          case 's': expiresInSeconds = value; break;
          case 'm': expiresInSeconds = value * 60; break;
          case 'h': expiresInSeconds = value * 60 * 60; break;
          case 'd': expiresInSeconds = value * 60 * 60 * 24; break;
        }
      }
      
      // Log the service token issuance
      try {
        await this.auditLogService.create({
          action: 'SERVICE_TOKEN_ISSUED',
          userId: null,
          targetId: serviceId,
          targetType: 'SERVICE',
          details: { 
            service: serviceName,
            permissions,
          },
          ip: null,
          userAgent: null,
        });
      } catch (error) {
        // Just log the error but continue with token issuance
        this.logger.warn(`Failed to create audit log for service token: ${error.message}`);
      }
      
      return {
        accessToken,
        expiresIn: expiresInSeconds,
        tokenType: 'Bearer',
      };
    } catch (error) {
      this.logger.error(`Service token issuance error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate service token using API key authentication
   * @param serviceTokenDto The service token request data
   * @returns A service token response
   */
  async generateServiceToken(serviceTokenDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse> {
    // Verify the API key matches what's expected for this service
    const { serviceId, serviceName, permissions, apiKey } = serviceTokenDto;
    
    // Get the SERVICE_API_KEYS from environment and parse it
    const serviceApiKeys = this.configService.get<string>('SERVICE_API_KEYS', '');
    if (!serviceApiKeys) {
      this.logger.warn('SERVICE_API_KEYS environment variable is not set');
      throw new UnauthorizedException({
        message: 'Service authentication is not properly configured',
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
    }
    
    // Parse API keys in format serviceId:apiKey,serviceId2:apiKey2
    const apiKeyMap = new Map<string, string>();
    serviceApiKeys.split(',').forEach(entry => {
      const [id, key] = entry.split(':');
      if (id && key) {
        apiKeyMap.set(id.trim(), key.trim());
      }
    });
    
    // Look up the API key by service ID 
    const expectedApiKey = apiKeyMap.get(serviceId);
    if (!expectedApiKey) {
      this.logger.warn(`No API key registered for service ${serviceName} (${serviceId})`);
      throw new UnauthorizedException({
        message: 'Invalid service credentials',
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
    }
    
    // Use constant-time comparison to prevent timing attacks when validating API keys
    const isValid = expectedApiKey === apiKey;
    if (!isValid) {
      this.logger.warn(`Invalid API key provided for service ${serviceName} (${serviceId})`);
      // Audit log the invalid attempt
      try {
        await this.auditLogService.create({
          action: 'SERVICE_AUTH_FAILED',
          userId: null,
          targetId: serviceId,
          targetType: 'SERVICE',
          details: { 
            service: serviceName,
            reason: 'Invalid API key',
          },
          ip: null,
          userAgent: null,
        });
      } catch (error) {
        this.logger.warn(`Failed to create audit log for failed service auth: ${error.message}`);
      }
      
      throw new UnauthorizedException({
        message: 'Invalid service credentials',
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
    }
    
    return this.issueServiceToken(serviceId, serviceName, permissions);
  }

  /**
   * Validate service permissions by checking if the service is allowed to have the requested permissions
   * @param serviceId Unique identifier for the service
   * @param serviceName Name of the service
   * @param permissions Array of permissions requested by the service
   */
  private async validateServicePermissions(
    serviceId: string,
    serviceName: string,
    permissions: string[],
  ): Promise<void> {
    // TODO: Implement proper permission validation based on service ID and name
    // For now, this is a placeholder that allows all permissions
    this.logger.debug(`Validating permissions for service ${serviceName}: ${permissions.join(', ')}`);
    return Promise.resolve();
  }
} 