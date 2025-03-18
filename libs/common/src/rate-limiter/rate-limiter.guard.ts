import { 
  Injectable, 
  ExecutionContext, 
  Inject, 
  Optional, 
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { 
  ThrottlerGuard, 
  ThrottlerModuleOptions, 
  ThrottlerStorage
} from '@nestjs/throttler';
import { THROTTLER_OPTIONS, ThrottlerStorageType } from './constants';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { LoggerFactory } from '../logger/logger.factory';

/**
 * Enhanced options for the rate limiter guard
 * Following Interface Segregation Principle
 */
export interface RateLimiterOptions {
  ttl: number;
  limit: number;
  excludePaths?: string[];
  keyPrefix?: string;
  storageType?: ThrottlerStorageType;
  trackUserIds?: boolean;
  errorMessage?: string;
}

/**
 * Interface for user object with userId
 */
interface UserWithId {
  userId?: string;
  [key: string]: any;
}

/**
 * Enhanced rate limiter guard with advanced features
 * Following Single Responsibility Principle by focusing only on rate limiting
 */
@Injectable()
export class RateLimiterGuard extends ThrottlerGuard {
  private readonly logger = LoggerFactory.getLogger('RateLimiterGuard');
  // Store the custom options separately from the parent class options
  private readonly customOptions: RateLimiterOptions;

  constructor(
    @Optional() @Inject(THROTTLER_OPTIONS) protected readonly injectedOptions: RateLimiterOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    // Create the options expected by the parent ThrottlerGuard
    const throttlerOptions: ThrottlerModuleOptions = {
      throttlers: [{
        ttl: injectedOptions?.ttl || 60,
        limit: injectedOptions?.limit || 10,
      }],
    };
    
    // Initialize the parent class with the expected options
    super(throttlerOptions, storageService, reflector);
    
    // Store our custom options for use in our methods
    this.customOptions = injectedOptions || {
      ttl: 60,
      limit: 10,
    };
    
    this.logger.log(`Rate limiter initialized with TTL: ${this.customOptions.ttl}s, Limit: ${this.customOptions.limit} requests`);
  }

  /**
   * Override the canActivate method to add more logging
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { ip, method, originalUrl } = request;
    
    // Get throttle metadata from the route handler or controller
    const throttle = this.reflector.getAllAndOverride('throttle', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    const limit = throttle?.limit || this.customOptions.limit;
    const ttl = throttle?.ttl || this.customOptions.ttl;
    
    try {
      const result = await super.canActivate(context);
      return result;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429) {
        this.logger.warn(`Rate limit exceeded for ${method} ${originalUrl} from ${ip} (Limit: ${limit}, TTL: ${ttl}s)`);
      }
      throw error;
    }
  }

  /**
   * Generate a unique key for rate limiting
   * Enhanced to support user tracking and custom prefixes
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ips?.length ? request.ips[0] : request.ip;
    
    // Track user ID if available and enabled
    let userId = 'anonymous';
    if (this.customOptions?.trackUserIds !== false && request.user) {
      const user = request.user as UserWithId;
      userId = user.userId || 'anonymous';
    }
    
    const path = request.route?.path || request.url;
    const prefix = this.customOptions?.keyPrefix || '';
    
    // Store the actual path and method in the key for easier extraction by the storage service
    const actualPath = request.originalUrl || request.url;
    const method = request.method;
    
    // Create a unique key combining all factors
    const key = `${prefix}:${ip}:${userId}:${path}:${name}${suffix}:path=${actualPath}:method=${method}`;
    return key;
  }

  /**
   * Determine if rate limiting should be skipped for this request
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.route?.path || request.url;

    // Skip if path is in excluded paths
    if (this.customOptions?.excludePaths?.includes(path)) {
      return true;
    }

    // Check for skip decorators
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>('skipRateLimit', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (skipRateLimit) {
      return true;
    }
    
    return false;
  }

  /**
   * Handle rate limit exceeded with custom error response
   */
  protected async handleRateLimit(
    request: Record<string, any>,
    response: Response,
    ttl: number,
    limit: number,
  ): Promise<void> {
    const errorMessage = this.customOptions?.errorMessage || 'Too many requests, please try again later';
    const retryAfter = Math.ceil(ttl / 1000);
    
    // Set standard rate limiting headers
    response.header('Retry-After', String(retryAfter));
    response.header('X-RateLimit-Limit', String(limit));
    response.header('X-RateLimit-Remaining', '0');
    response.header('X-RateLimit-Reset', String(Date.now() + ttl));
    
    // Log the rate limit exceeded event
    this.logger.warn(`Rate limit exceeded for IP: ${request.ip}, Path: ${request.url}`);
    
    // Throw a standard HTTP exception
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: errorMessage,
        error: 'Too Many Requests',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Override the getTrackers method to use the throttle metadata from the route handler
   */
  protected getTrackers(context: ExecutionContext): { ttl: number; limit: number; name: string }[] {
    // Get throttle metadata from the route handler
    const throttle = this.reflector.getAllAndOverride('throttle', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (throttle) {
      // Store the throttle configuration in the request for use by the storage service
      const request = context.switchToHttp().getRequest();
      request.throttleConfig = {
        limit: throttle.limit,
        ttl: throttle.ttl,
      };
      
      return [
        {
          ttl: throttle.ttl,
          limit: throttle.limit,
          name: 'default',
        },
      ];
    }
    
    // Fall back to the default options
    // Store the default configuration in the request for use by the storage service
    const request = context.switchToHttp().getRequest();
    request.throttleConfig = {
      limit: this.customOptions.limit,
      ttl: this.customOptions.ttl * 1000, // Convert to milliseconds
    };
    
    return [
      {
        ttl: this.customOptions.ttl * 1000, // Convert to milliseconds
        limit: this.customOptions.limit,
        name: 'default',
      },
    ];
  }
}
