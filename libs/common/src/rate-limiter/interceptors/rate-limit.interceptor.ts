import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { LoggerFactory } from '../../logger/logger.factory';
import { ErrorHandlerService } from '../../exceptions/error-handler.service';
import { Request } from 'express';
import { DynamicRateLimiterService, UserTrustLevel } from '../services/dynamic-rate-limiter.service';
import { ThrottlerStorage } from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from '../constants/tokens';
import { RATE_LIMIT_CONFIGS } from '../constants/rate-limit-configs';

/**
 * Interface for throttle metadata from decorators
 */
interface ThrottleMetadata {
  limit: number;
  ttl: number;
}

/**
 * Interface for dynamic rate limit metadata from decorators
 */
interface DynamicRateLimitMetadata {
  service: string;
  endpoint: string;
}

/**
 * Interceptor for processing rate limit information
 * Note: Headers are set by the DynamicRateLimiterGuard
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = LoggerFactory.getLogger('RateLimitInterceptor');
  private readonly errorHandler: ErrorHandlerService;
  private microserviceName: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly dynamicRateLimiterService?: DynamicRateLimiterService,
    private readonly storageService?: ThrottlerStorage,
    @Inject(THROTTLER_OPTIONS) private readonly options?: Record<string, any>
  ) {
    this.errorHandler = new ErrorHandlerService('RateLimitInterceptor');
  }
  
  /**
   * Set the microservice context for this interceptor
   */
  public setMicroserviceContext(serviceName: string): void {
    this.microserviceName = serviceName;
    this.logger.log(`RateLimitInterceptor configured for microservice: ${serviceName}`);
  }

  /**
   * Helper function to safely get metadata using the reflector
   */
  private getMetadata<T>(key: string, targets: any[]): T | undefined {
    for (const target of targets) {
      const metadata = this.reflector.get<T>(key, target);
      if (metadata !== undefined) {
        return metadata;
      }
    }
    return undefined;
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: Request | any): string | undefined {
    if (request.user) {
      const user = request.user as any;
      return user.userId || user.id || user.sub;
    }
    return undefined;
  }

  /**
   * Determine user trust level based on request information
   */
  private determineTrustLevel(request: Request | any): UserTrustLevel {
    if (!request.user) {
      return UserTrustLevel.NEW;
    }
    
    const userAgent = request.headers?.['user-agent'] || '';
    if (userAgent.includes('bot') || userAgent.includes('script') || userAgent.includes('automation')) {
      return UserTrustLevel.AUTOMATED;
    }
    
    return UserTrustLevel.STANDARD;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Get request based on context type
    let request: any;
    const contextType = context.getType();
    
    if (contextType === 'http') {
      request = context.switchToHttp().getRequest<Request>();
    } else if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc();
      const data = rpcContext.getData() || {};
      const ctx = rpcContext.getContext();
      
      request = {
        ...data,
        client: ctx.client || {},
        ip: ctx.client?.ip || '0.0.0.0',
        path: `rpc:${context.getHandler().name}`,
        method: 'RPC',
        headers: data.headers || {},
        user: data.user || ctx.user || null
      };
    } else {
      return next.handle();
    }
    
    try {
      // Skip if the endpoint is marked to skip throttling
      const skipThrottle = this.getMetadata<boolean>('skipThrottle', [context.getHandler(), context.getClass()]);
      if (skipThrottle) {
        return next.handle();
      }
      
      // Get dynamic rate limit metadata
      const dynamicRateLimit = this.getMetadata<DynamicRateLimitMetadata>(
        'dynamicRateLimit',
        [context.getHandler(), context.getClass()]
      );
      
      // Get throttle metadata
      const throttle = this.getMetadata<ThrottleMetadata>(
        'throttle', 
        [context.getHandler(), context.getClass()]
      );
      
      // We do not set rate limit headers here as they are set by DynamicRateLimiterGuard
      return next.handle();
    } catch (error) {
      this.logger.error(`Rate limit interceptor error: ${error.message}`);
      return next.handle();
    }
  }
} 