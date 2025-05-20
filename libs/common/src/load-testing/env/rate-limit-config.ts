import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DisabledThrottlerStorage } from '../../rate-limiter/storage/disabled-throttler.storage';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Service that provides rate limiting configuration based on environment variables
 * This is used primarily for Docker environments where file-based toggling isn't practical
 */
@Injectable()
export class RateLimitConfigService {
  private readonly logger = LoggerFactory.getLogger('RateLimitConfigService');
  
  constructor(private readonly configService: ConfigService) {}
  
  /**
   * Get ThrottlerModule configuration based on environment variables
   * Instead of returning ThrottlerModuleOptions, we use a generic return type
   * since the exact interface seems to have issues with TypeScript
   */
  getThrottlerConfig<T = any>(serviceName: string): T {
    const isRateLimitingEnabled = this.configService.get('ENABLE_RATE_LIMITING', 'true') === 'true';
    
    if (!isRateLimitingEnabled) {
      this.logger.warn(`⚠️ Rate limiting is DISABLED for ${serviceName} via environment variable`);
      
      // Return configuration with type assertion
      return {
        ttl: 60,
        limit: 100000, // Very high limit to essentially disable rate limiting
        storage: 'memory',
        microserviceName: `${serviceName}-service`,
        errorMessage: 'Rate limiting disabled for testing',
        excludeRoutes: ['/api/health', '/api/load-test/*'],
        keyPrefix: `${serviceName}-throttler:`,
        useGlobalGuard: false,
        useGlobalFilter: true,
        useGlobalInterceptor: true,
        throttlers: [], // Empty throttlers array is required in newer versions
        extraProviders: [
          {
            provide: ThrottlerStorage,
            useClass: DisabledThrottlerStorage,
          }
        ]
      } as T;
    }
    
    this.logger.log(`✓ Rate limiting is ENABLED for ${serviceName}`);
    
    // Return configuration with type assertion
    return {
      ttl: this.configService.get('THROTTLE_TTL', 60),
      limit: this.configService.get('THROTTLE_LIMIT', 100),
      storage: 'redis',
      microserviceName: `${serviceName}-service`,
      errorMessage: 'Too many requests from this IP, please try again later',
      excludeRoutes: ['/api/health'],
      keyPrefix: `${serviceName}-throttler:`,
      useGlobalGuard: true,
      useGlobalFilter: true,
      useGlobalInterceptor: true,
      throttlers: [], // Empty throttlers array is required in newer versions
    } as T;
  }
} 