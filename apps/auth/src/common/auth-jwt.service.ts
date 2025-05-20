import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtService } from '@app/common/jwt';
import { ServiceTokenDto } from '../dto/service-token.dto';
import { ServiceTokenResponse } from '@app/common/auth/interfaces';
import { AppConfigService } from '@app/common';
import * as crypto from 'crypto';

/**
 * Auth-specific JWT service that implements JWT functionality
 * without extending the common library's JwtService
 */
@Injectable()
export class AuthJwtService {
  private readonly logger = new Logger(AuthJwtService.name);
  // Max allowed token lifetime (12 hours by default)
  private readonly MAX_TOKEN_LIFETIME = 12 * 60 * 60; // in seconds
  
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    this.logger.log('AuthJwtService initialized');
  }

  /**
   * Parse expiry time string to seconds
   * @param expiryTime Time string with unit (e.g. '1h', '7d')
   * @returns Number of seconds
   */
  private parseExpiryTime(expiryTime: string): number {
    const match = expiryTime.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour if format is invalid
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value; // seconds
      case 'm': return value * 60; // minutes to seconds
      case 'h': return value * 3600; // hours to seconds
      case 'd': return value * 86400; // days to seconds
      default: return 3600;
    }
  }

  /**
   * Validate a service API key against expected values
   * @param providedApiKey API key provided in the request
   * @param serviceId Service ID to validate against
   * @returns Boolean indicating if the API key is valid
   */
  public validateServiceApiKey(providedApiKey: string, serviceId: string): boolean {
    if (!providedApiKey || !serviceId) {
      this.logger.warn('Missing API key or service ID in validation request');
      return false;
    }
    
    // Get the API keys from environment variables
    const serviceApiKeys = this.configService.get<string>('SERVICE_API_KEYS', '');
    
    if (!serviceApiKeys) {
      this.logger.error('SERVICE_API_KEYS environment variable is not configured');
      return false;
    }
    
    // Parse the API keys string (format: "serviceId1:key1,serviceId2:key2")
    const apiKeyMap = new Map<string, string>();
    
    serviceApiKeys.split(',').forEach(pair => {
      const [id, key] = pair.split(':');
      if (id && key) {
        const trimmedId = id.trim();
        const trimmedKey = key.trim();
        apiKeyMap.set(trimmedId, trimmedKey);
      }
    });
    
    // Check if the service ID exists and the API key matches
    const expectedApiKey = apiKeyMap.get(serviceId);
    
    if (!expectedApiKey) {
      this.logger.warn(`No API key configured for service ID: ${serviceId}`);
      return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedApiKey), 
        Buffer.from(expectedApiKey)
      );
    } catch (error) {
      this.logger.error(`Error comparing API keys: ${error.message}`);
      // If buffers are different lengths, timingSafeEqual throws an error
      return false;
    }
  }

  /**
   * Generate a service token response
   * @param tokenRequest DTO with service information and API key
   * @returns Service token response
   */
  generateServiceTokenResponse(tokenRequest: ServiceTokenDto): ServiceTokenResponse {
    // Validate the API key
    const isValidApiKey = this.validateServiceApiKey(
      tokenRequest.apiKey,
      tokenRequest.serviceId
    );
    
    if (!isValidApiKey) {
      this.logger.warn(`Invalid API key provided for service ID: ${tokenRequest.serviceId}`);
      throw new Error('Invalid API key for service');
    }
    
    // Parse expiry time
    let expiryInSeconds = this.parseExpiryTime(tokenRequest.expiresIn || '1h');
    
    // Security check: enforce maximum token lifetime
    if (expiryInSeconds > this.MAX_TOKEN_LIFETIME) {
      this.logger.warn(`Token expiry time ${expiryInSeconds}s exceeds maximum allowed (${this.MAX_TOKEN_LIFETIME}s). Using maximum value.`);
      expiryInSeconds = this.MAX_TOKEN_LIFETIME;
    }
    
    // Create payload
    const servicePayload = {
      serviceId: tokenRequest.serviceId,
      serviceName: tokenRequest.serviceName,
      permissions: tokenRequest.permissions || []
    };
    
    // Sign with JwtService
    const accessToken = this.jwtService.sign(servicePayload, {
      expiresIn: expiryInSeconds,
      audience: tokenRequest.serviceName,
      issuer: 'auth-service'
    });
    
    return {
      accessToken,
      expiresIn: expiryInSeconds,
      tokenType: 'Bearer'
    };
  }
} 