import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Interceptor for adding rate limit headers to responses
 * This follows the Single Responsibility Principle by focusing only on adding rate limit headers
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = LoggerFactory.getLogger('RateLimitInterceptor');

  constructor(private readonly reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Get throttle metadata from the route handler
    const throttle = this.reflector.get('throttle', context.getHandler());
    
    // If no throttle metadata is found, check the controller
    const controllerThrottle = this.reflector.get('throttle', context.getClass());
    
    // Use handler metadata if available, otherwise use controller metadata
    const effectiveThrottle = throttle || controllerThrottle;
    
    // Default values if no throttle metadata is found
    const limit = effectiveThrottle?.limit || 10;
    const ttl = effectiveThrottle?.ttl || 60000;

    return next.handle().pipe(
      tap(() => {
        // Skip adding headers if the response is already sent
        if (response.headersSent) {
          return;
        }
        
        // Add rate limit headers
        response.header('X-RateLimit-Limit', limit.toString());
        response.header('X-RateLimit-Window', `${ttl / 1000} seconds`);
        response.header('X-RateLimit-Policy', `${limit} requests per ${ttl / 1000} seconds`);
      }),
    );
  }
} 