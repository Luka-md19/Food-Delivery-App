import { 
  Injectable, 
  ExecutionContext, 
  HttpException, 
  HttpStatus,
  Inject,
  OnModuleInit
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { LoggerFactory } from '../../logger/logger.factory';
import { DynamicRateLimiterService, UserTrustLevel } from '../services/dynamic-rate-limiter.service';
import { THROTTLER_OPTIONS } from '../constants/tokens';
import { Request, Response } from 'express';
import { RATE_LIMIT_CONFIGS } from '../constants/rate-limit-configs';

/**
 * Interface for throttle configuration
 */
interface ThrottleConfig {
  ttl: number;
  limit: number;
}

/**
 * Interface for dynamic rate limit metadata
 */
interface DynamicRateLimitMetadata {
  service: string;
  endpoint: string;
}

/**
 * Enhanced guard that uses dynamic rate limiting
 */
@Injectable()
export class DynamicRateLimiterGuard extends ThrottlerGuard implements OnModuleInit {
  private readonly logger = LoggerFactory.getLogger(DynamicRateLimiterGuard.name);
  
  @Inject(THROTTLER_OPTIONS)
  protected readonly options: any; 

  // Default fallback values
  private fallbackThrottlers = {
    limit: 100,
    ttl: 60000,
  };
  
  private microserviceName: string | undefined;

  constructor(
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
    private readonly dynamicRateLimiterService: DynamicRateLimiterService
  ) {
    super({ throttlers: [{ limit: 10, ttl: 60000 }] }, storageService, reflector);
    this.throttlers = [{ limit: 10, ttl: 60000 }];
  }

  async onModuleInit(): Promise<void> {
    const throttlers = this.getOptionThrottlers();
    if (!throttlers || !Array.isArray(throttlers)) {
      this.logger.warn('Throttlers not properly configured, using fallback');
    }
    return Promise.resolve();
  }

  /**
   * Helper methods to safely get options
   */
  private getOptionThrottlers(): Array<{ ttl: number; limit: number; name?: string }> | undefined {
    return this.options?.throttlers;
  }

  private getOptionTtl(): number {
    return this.options?.ttl || 60;
  }

  private getOptionLimit(): number {
    return this.options?.limit || 100;
  }

  private getOptionErrorMessage(): string {
    return this.options?.errorMessage || 'Too many requests, please try again later';
  }

  /**
   * Custom implementation of metadata extraction
   */
  private getMetadata<T>(key: string, targets: any[]): T | undefined {
    for (const target of targets) {
      try {
        const metadata = this.reflector.get<T>(key, target);
        if (metadata !== undefined) {
          return metadata;
        }
      } catch (error) {
        // Silent fail
      }
    }
    return undefined;
  }

  /**
   * Check if an unknown object is a valid ThrottleConfig
   */
  private isValidThrottleConfig(obj: unknown): obj is ThrottleConfig {
    return (
      typeof obj === 'object' && 
      obj !== null && 
      'ttl' in obj && 
      'limit' in obj && 
      typeof (obj as any).ttl === 'number' && 
      typeof (obj as any).limit === 'number'
    );
  }

  /**
   * Check if the request falls within the rate limit
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is marked to skip throttling
    const skipThrottle = this.getMetadata<boolean>('skipThrottle', [context.getHandler(), context.getClass()]);
    if (skipThrottle) {
      return true;
    }

    // Get the throttle trackers for this route
    const trackers = this.getTrackers(context);
    
    // Get the request and response objects
    const { req, res } = this.getRequestResponse(context);
    
    if (!trackers || trackers.length === 0) {
      return true;
    }

    try {
      // Process each throttle configuration
      for (const throttler of trackers) {
        const name = throttler.name || 'default';
        const suffix = req.path || req.url || '/';
        const key = this.generateKey(context, suffix, name);
        const ttl = throttler.ttl;
        const limit = throttler.limit;
        
        // Include all required parameters for increment
        const { totalHits } = await this.storageService.increment(
          key, 
          ttl,
          limit,
          ttl * 2, // Block duration (twice the TTL)
          name     // Throttler name
        );

        // Set rate limit headers
        if (res?.header && typeof res.header === 'function') {
          this.setResponseHeaders(res as any, ttl, limit, totalHits);
        }
        
        // If the request exceeds the limit, enforce the limit
        if (totalHits > limit) {
          this.logger.warn(`Rate limit exceeded for ${key}: ${totalHits}/${limit}`);
          await this.handleRateLimit(req, res as any, ttl, limit);
          return false; // This will never be reached because handleRateLimit throws an exception
        }
      }
      
      return true;
    } catch (error) {
      // If the error is a rate limit exception, re-throw it to enforce the limit
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      this.logger.error(`Rate limiting error: ${error.message}`);
      return true; // Allow the request if there's an internal error
    }
  }

  /**
   * Determine which rate limit trackers to use for this request
   */
  protected getTrackers(context: ExecutionContext): { ttl: number; limit: number; name: string }[] {
    try {
      // Check for dynamic rate limiting decorator
      const dynamicRateLimit = this.getMetadata<DynamicRateLimitMetadata>(
        'dynamicRateLimit',
        [context.getHandler(), context.getClass()]
      );
      
      if (dynamicRateLimit && this.dynamicRateLimiterService) {
        // Get request for user context
        const reqRes = this.getRequestResponse(context);
        const req = reqRes.req;
        
        // Extract user information for rate limiting
        const userId = this.extractUserId(req);
        const trustLevel = this.determineTrustLevel(req as any);
        
        // Get dynamic rate limit from service
        const serviceKey = dynamicRateLimit.service as keyof typeof RATE_LIMIT_CONFIGS;
        const { ttl, limit } = this.dynamicRateLimiterService.getRateLimit(
          serviceKey,
          dynamicRateLimit.endpoint,
          userId,
          trustLevel
        );
        
        // Return dynamic tracker with millisecond TTL
        return [{ 
          ttl: ttl * 1000, // Convert to milliseconds
          limit,
          name: `${dynamicRateLimit.service}.${dynamicRateLimit.endpoint}`
        }];
      }
      
      // Check for throttle decorator
      const throttle = this.getMetadata<ThrottleConfig>(
        'throttle',
        [context.getHandler(), context.getClass()]
      );
      
      if (throttle && this.isValidThrottleConfig(throttle)) {
        return [{ 
          ttl: throttle.ttl, 
          limit: throttle.limit,
          name: 'custom' 
        }];
      }
      
      // Use default throttlers from options
      const throttlers = this.getOptionThrottlers();
      if (throttlers && Array.isArray(throttlers) && throttlers.length > 0) {
        return throttlers.map(t => ({
          ttl: t.ttl,
          limit: t.limit,
          name: t.name || 'default'
        }));
      }
      
      // Use fallback if nothing else is available
      return [{
        ttl: this.fallbackThrottlers.ttl as number,
        limit: this.fallbackThrottlers.limit as number,
        name: 'fallback'
      }];
    } catch (error) {
      this.logger.error(`Error getting trackers: ${error.message}`);
      
      // Use fallback if there's an error
      return [{
        ttl: this.fallbackThrottlers.ttl as number,
        limit: this.fallbackThrottlers.limit as number,
        name: 'error-fallback'
      }];
    }
  }

  /**
   * Extract userId from request for rate limiting
   */
  private extractUserId(request: Record<string, any>): string | undefined {
    if (!request.user) {
      return undefined;
    }
    
    return request.user.userId || request.user.id || request.user.sub;
  }

  /**
   * Determine trust level based on user information and request context
   */
  private determineTrustLevel(request: Request): UserTrustLevel {
    if (!request.user) {
      return UserTrustLevel.NEW;
    }
    
    const userAgent = request.headers?.['user-agent'] || '';
    if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('script')) {
      return UserTrustLevel.AUTOMATED;
    }
    
    return UserTrustLevel.STANDARD;
  }

  /**
   * Set the microservice context for this guard
   */
  public setMicroserviceContext(serviceName: string): void {
    this.microserviceName = serviceName;
  }

  /**
   * Get request and response objects based on execution context type
   */
  getRequestResponse(context: ExecutionContext): { req: Record<string, any>; res: Record<string, any> } {
    const contextType = context.getType();
    
    if (contextType === 'http') {
      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse();
      return { req, res };
    } 
    
    if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc();
      const data = rpcContext.getData() || {};
      const ctx = rpcContext.getContext() || {};
      
      const req = {
        ...data,
        client: ctx.client || {},
        ip: ctx.client?.ip || '0.0.0.0',
        path: `rpc:${context.getHandler().name}`,
        method: 'RPC',
        headers: data.headers || {},
        user: data.user || ctx.user
      };
      
      // Mock response object with required methods
      const res = {
        header: () => {}, // Headers can't be set in RPC responses
        status: (code: number) => res,
        json: (data: any) => data,
        send: (data: any) => data
      };
      
      return { req, res };
    }
    
    if (contextType === 'ws') {
      const client = context.switchToWs().getClient();
      const data = context.switchToWs().getData();
      
      const req = {
        ...data,
        client,
        ip: client.conn?.remoteAddress || '0.0.0.0',
        path: `ws:${context.getHandler().name}`,
        method: 'WS',
        headers: client.handshake?.headers || {},
        user: client.user || client.handshake?.user
      };
      
      const res = {
        header: () => {}, // Headers can't be set in WS responses
        status: (code: number) => res,
        json: (data: any) => data,
        send: (data: any) => data
      };
      
      return { req, res };
    }
    
    // Default empty request/response for unknown context types
    return { 
      req: { path: 'unknown', ip: '0.0.0.0', method: 'UNKNOWN' },
      res: { header: () => {}, status: () => ({}), json: (d) => d, send: (d) => d }
    };
  }

  /**
   * Generate a key for tracking rate limiting
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    try {
      const req = this.getRequestResponse(context).req;
      const prefix = 'rate_limit';
      const userId = this.extractUserId(req);
      const ip = req.ip || req.client?.ip || '0.0.0.0';
      
      // Use microservice name if available
      const contextPrefix = this.microserviceName ? `${this.microserviceName}:` : '';
      
      // Include user ID in key if available for per-user rate limiting
      if (userId) {
        return `${contextPrefix}${prefix}:user:${userId}:${name}:${suffix}`;
      }
      
      // Fall back to IP-based rate limiting
      return `${contextPrefix}${prefix}:ip:${ip}:${name}:${suffix}`;
    } catch (error) {
      // Ensure a valid key even in case of error
      return `rate_limit:error:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    }
  }

  /**
   * Handle rate limit exceeded
   */
  protected async handleRateLimit(
    request: Record<string, any>,
    response: Response,
    ttl: number,
    limit: number,
  ): Promise<void> {
    const errorMessage = this.getOptionErrorMessage();
    const remainingSeconds = Math.ceil(ttl / 1000);
    
    // Set headers for rejected requests
    if (response?.header && typeof response.header === 'function') {
      // Ensure remaining is 0 for rate-limited requests
      this.setResponseHeaders(response, ttl, limit, limit + 1);
      response.header('Retry-After', remainingSeconds.toString());
    }
    
    // Try to set the status code directly
    if (response?.status && typeof response.status === 'function') {
      response.status(HttpStatus.TOO_MANY_REQUESTS);
    }
    
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: errorMessage,
        error: 'Too Many Requests',
        retryAfter: remainingSeconds
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  /**
   * Set rate limit headers on response
   */
  private setResponseHeaders(response: Response, ttl: number, limit: number, totalHits: number): void {
    if (!response || !response.header || typeof response.header !== 'function') {
      return;
    }
    
    // Calculate remaining requests (ensure it's never negative)
    const currentRemaining = Math.max(0, limit - totalHits);
    
    // Calculate reset time in Unix timestamp format (seconds)
    const resetTime = Math.ceil(Date.now() / 1000) + Math.ceil(ttl / 1000);
    
    // Set standard rate limit headers with accurate remaining count
    response.header('X-Ratelimit-Limit', limit.toString());
    response.header('X-Ratelimit-Remaining', currentRemaining.toString());
    response.header('X-Ratelimit-Reset', resetTime.toString());
    
    // Set RFC 6585 compliant headers
    if (currentRemaining === 0) {
      response.header('Retry-After', Math.ceil(ttl / 1000).toString());
    }
    
    // Add context headers
    if (this.microserviceName) {
      response.header('X-Rate-Limit-Context', this.microserviceName);
    }
    
    // Add policy information
    response.header('X-Ratelimit-Policy', `${limit} requests per ${Math.ceil(ttl / 1000)} seconds`);
    
    // Expose these headers to the client
    response.header('Access-Control-Expose-Headers', 
      'X-Ratelimit-Limit,X-Ratelimit-Remaining,X-Ratelimit-Reset,Retry-After,X-Rate-Limit-Context,X-Ratelimit-Policy');
  }
} 