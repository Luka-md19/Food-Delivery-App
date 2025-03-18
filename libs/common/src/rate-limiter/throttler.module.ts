import { DynamicModule, Module, Provider, Logger, Type } from '@nestjs/common';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { RateLimiterGuard } from './rate-limiter.guard';
import { THROTTLER_OPTIONS, ThrottlerStorageType } from './constants';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitExceptionFilter } from './filters/rate-limit-exception.filter';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { RedisThrottlerStorage } from './storage/redis-throttler.storage';
import { MemoryThrottlerStorage } from './storage/memory-throttler.storage';
import { ThrottlerStorage } from '@nestjs/throttler';
import { LoggerFactory } from '../logger/logger.factory';

/**
 * Interface for throttler module options
 * Following Interface Segregation Principle by having specific interfaces
 */
export interface ThrottlerModuleOptions {
  /**
   * Time-to-live for rate limiting in seconds
   */
  ttl?: number;
  
  /**
   * Request limit per TTL period
   */
  limit?: number;
  
  /**
   * Paths to exclude from rate limiting
   */
  excludePaths?: string[];
  
  /**
   * Prefix for rate limiting keys
   */
  keyPrefix?: string;
  
  /**
   * Storage type for rate limiting (memory or redis)
   */
  storageType?: ThrottlerStorageType;
  
  /**
   * Whether to use the global guard
   * @default true
   */
  useGlobalGuard?: boolean;
  
  /**
   * Whether to use the global filter for rate limit exceptions
   * @default true
   */
  useGlobalFilter?: boolean;
  
  /**
   * Whether to use the global interceptor for rate limit headers
   * @default true
   */
  useGlobalInterceptor?: boolean;
  
  /**
   * Whether to track user IDs in rate limiting
   * @default true
   */
  trackUserIds?: boolean;
  
  /**
   * Custom response for rate limit exceeded
   */
  errorMessage?: string;
}

/**
 * Enhanced throttler module with advanced configuration
 * Following Single Responsibility Principle by focusing only on rate limiting
 */
@Module({
  providers: [RateLimiterGuard, RateLimitExceptionFilter, RateLimitInterceptor],
  exports: [RateLimiterGuard, RateLimitExceptionFilter, RateLimitInterceptor]
})
export class ThrottlerModule {
  private static readonly logger = LoggerFactory.getLogger('ThrottlerModule');

  /**
   * Register the throttler module with basic options
   * @param options Throttler module options
   * @returns Dynamic module
   */
  static forRoot(options?: ThrottlerModuleOptions): DynamicModule {
    const ttl = options?.ttl || 60;
    const limit = options?.limit || 10;
    const storageType = options?.storageType || ThrottlerStorageType.MEMORY;
    
    this.logger.log(`Initializing ThrottlerModule with ttl=${ttl}s, limit=${limit}, storage=${storageType}`);
    
    const throttlerOptions = [{
      ttl,
      limit,
    }];
    
    // Configure the storage provider based on the storage type
    let storageClass: Type<ThrottlerStorage>;
    if (storageType === ThrottlerStorageType.REDIS) {
      this.logger.log('Using Redis storage for rate limiting');
      storageClass = RedisThrottlerStorage;
    } else {
      this.logger.log('Using Memory storage for rate limiting');
      storageClass = MemoryThrottlerStorage;
    }
    
    const storageProvider: Provider = {
      provide: ThrottlerStorage,
      useClass: storageClass,
    };

    const providers: Provider[] = [
      RateLimiterGuard,
      RateLimitExceptionFilter,
      RateLimitInterceptor,
      storageProvider,
      {
        provide: THROTTLER_OPTIONS,
        useValue: {
          ttl,
          limit,
          excludePaths: options?.excludePaths || [],
          keyPrefix: options?.keyPrefix || '',
          storageType,
          trackUserIds: options?.trackUserIds !== false,
          errorMessage: options?.errorMessage || 'Too many requests, please try again later',
        },
      },
    ];

    // Add global guard if enabled
    if (options?.useGlobalGuard !== false) {
      this.logger.log('Registering global rate limiter guard');
      providers.push({
        provide: APP_GUARD,
        useClass: RateLimiterGuard,
      });
    }
    
    // Add global filter if enabled
    if (options?.useGlobalFilter !== false) {
      this.logger.log('Registering global rate limit exception filter');
      providers.push({
        provide: APP_FILTER,
        useClass: RateLimitExceptionFilter,
      });
    }
    
    // Add global interceptor if enabled
    if (options?.useGlobalInterceptor !== false) {
      this.logger.log('Registering global rate limit interceptor');
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: RateLimitInterceptor,
      });
    }

    return {
      module: ThrottlerModule,
      imports: [
        NestThrottlerModule.forRoot({
          throttlers: throttlerOptions,
        }),
      ],
      providers,
      exports: [
        NestThrottlerModule,
        THROTTLER_OPTIONS,
        RateLimiterGuard,
        RateLimitExceptionFilter,
        RateLimitInterceptor,
        ThrottlerStorage
      ],
    };
  }

  /**
   * Register the throttler module with async options
   * @param options Async module options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => ThrottlerModuleOptions | Promise<ThrottlerModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    this.logger.log('Initializing ThrottlerModule with async options');
    
    return {
      module: ThrottlerModule,
      imports: [
        ...(options.imports || []),
        NestThrottlerModule.forRoot(),
      ],
      providers: [
        RateLimiterGuard,
        RateLimitExceptionFilter,
        RateLimitInterceptor,
        {
          provide: APP_GUARD,
          useClass: RateLimiterGuard,
        },
        {
          provide: APP_FILTER,
          useClass: RateLimitExceptionFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RateLimitInterceptor,
        },
      ],
      exports: [
        NestThrottlerModule,
        RateLimiterGuard,
        RateLimitExceptionFilter,
        RateLimitInterceptor
      ],
    };
  }
}
