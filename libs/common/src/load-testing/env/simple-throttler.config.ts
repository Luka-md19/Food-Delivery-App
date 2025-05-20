import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Service that provides a simple way to get rate limiting configuration
 * without dealing with complex type issues from ThrottlerModule.
 */
@Injectable()
export class SimpleThrottlerConfig {
  private readonly logger = LoggerFactory.getLogger('SimpleThrottlerConfig');
  
  constructor(private readonly configService: ConfigService) {}
  
  /**
   * Get the configuration for the service based on environment variables
   */
  getConfig(serviceName: string) {
    const isRateLimitingEnabled = this.configService.get('ENABLE_RATE_LIMITING', 'true') === 'true';
    
    if (!isRateLimitingEnabled) {
      this.logger.warn(`⚠️ Rate limiting is DISABLED for ${serviceName} via environment variable`);
      return {
        isEnabled: false,
        config: {
          storage: 'memory',
          limit: 100000,
          ttl: 60,
          throttlers: [],
        }
      };
    }
    
    this.logger.log(`✓ Rate limiting is ENABLED for ${serviceName}`);
    return {
      isEnabled: true,
      config: {
        storage: 'redis',
        limit: this.configService.get('THROTTLE_LIMIT', 100),
        ttl: this.configService.get('THROTTLE_TTL', 60),
        throttlers: [],
      }
    };
  }
} 