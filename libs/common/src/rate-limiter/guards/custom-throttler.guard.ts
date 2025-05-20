import { 
  Injectable, 
  ExecutionContext, 
  HttpException, 
  HttpStatus,
  CanActivate
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerFactory } from '../../logger/logger.factory';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Request, Response } from 'express';

/**
 * Simplified throttler guard for stable rate limiting implementation
 */
@Injectable()
export class CustomThrottlerGuard implements CanActivate {
  private readonly logger = LoggerFactory.getLogger('CustomThrottlerGuard');
  
  // Default values
  private readonly ttl = 60000; // 60 seconds
  private readonly limit = 10; // 10 requests per minute
  private microserviceName: string | undefined;

  constructor(
    private readonly storageService: ThrottlerStorage,
    private readonly reflector: Reflector
  ) {}
  
  /**
   * Set the microservice context for this guard
   */
  public setMicroserviceContext(serviceName: string): void {
    this.microserviceName = serviceName;
  }

  /**
   * Implementation of CanActivate interface
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Check if the endpoint is marked to skip throttling
      const skipThrottle = this.reflector.get('skipThrottle', context.getHandler()) ||
                           this.reflector.get('skipThrottle', context.getClass());
      
      if (skipThrottle) {
        return true;
      }

      // Get request and response based on context type
      const { req, res } = this.getRequestResponse(context);
      if (!req || !req.path) {
        return true; // Skip if we can't determine the request
      }

      // Get throttle configuration
      const throttleConfig = this.getThrottleConfig(context);
      const key = this.generateKey(req);

      try {
        // Track request count with all required arguments
        const { totalHits } = await this.storageService.increment(
          key, 
          throttleConfig.ttl,
          throttleConfig.limit,
          throttleConfig.ttl * 2, // Block duration (twice the TTL)
          'custom-throttler' // Identifier
        );

        // Set rate limit headers if possible
        if (res && typeof res.header === 'function') {
          this.setHeaders(res, totalHits, throttleConfig.limit, throttleConfig.ttl);
        }

        // If hits exceed limit, throw a throttling exception
        if (totalHits > throttleConfig.limit) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests, please try again later',
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil(throttleConfig.ttl / 1000)
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      } catch (error) {
        // Rethrow rate limit exceptions
        if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
          throw error;
        }
        
        this.logger.error(`Storage error: ${error.message}`);
        return true; // Allow request on errors
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      
      this.logger.error(`Rate limiting error: ${error.message}`);
      return true; // Default to allowing requests if rate limiting fails
    }
  }

  /**
   * Get request and response objects from context
   */
  private getRequestResponse(context: ExecutionContext): { req: any; res: any } {
    const contextType = context.getType();
    
    if (contextType === 'http') {
      const httpContext = context.switchToHttp();
      return {
        req: httpContext.getRequest<Request>(),
        res: httpContext.getResponse<Response>()
      };
    } 
    
    if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc();
      const data = rpcContext.getData() || {};
      const ctx = rpcContext.getContext();
      
      const req = {
        ...data,
        client: ctx.client || {},
        ip: ctx.client?.ip || '0.0.0.0',
        path: `rpc:${context.getHandler().name}`,
        method: 'RPC'
      };
      
      const res = {
        header: (name: string, value: string) => {}
      };
      
      return { req, res };
    }
    
    return { req: null, res: null };
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(request: Request | any): string {
    const ip = request.ip || request.client?.ip || '0.0.0.0';
    const path = request.path || request.url || 'unknown';
    const prefix = this.microserviceName ? `${this.microserviceName}:` : '';
    
    return `throttler:${prefix}${ip}:${path}`;
  }

  /**
   * Set rate limit headers on the response
   */
  private setHeaders(response: Response, totalHits: number, limit: number, ttl: number): void {
    const remaining = Math.max(0, limit - totalHits);
    const reset = Math.ceil(Date.now() / 1000) + Math.ceil(ttl / 1000);

    response.header('X-RateLimit-Limit', limit.toString());
    response.header('X-RateLimit-Remaining', remaining.toString());
    response.header('X-RateLimit-Reset', reset.toString());
  }

  /**
   * Get throttle configuration from metadata
   */
  private getThrottleConfig(context: ExecutionContext): { ttl: number; limit: number } {
    // Try handler metadata first
    const handlerMetadata = this.reflector.get('throttle', context.getHandler());
    if (handlerMetadata && typeof handlerMetadata === 'object' && 
        'ttl' in handlerMetadata && 'limit' in handlerMetadata) {
      return handlerMetadata;
    }
    
    // Then try class metadata
    const classMetadata = this.reflector.get('throttle', context.getClass());
    if (classMetadata && typeof classMetadata === 'object' && 
        'ttl' in classMetadata && 'limit' in classMetadata) {
      return classMetadata;
    }
    
    // Fall back to defaults
    return {
      ttl: this.ttl,
      limit: this.limit
    };
  }
} 