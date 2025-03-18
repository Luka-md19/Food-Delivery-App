import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerFactory } from '../logger.factory';

/**
 * Interceptor for logging requests and responses
 * This follows the Single Responsibility Principle by focusing only on logging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = LoggerFactory.getLogger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query } = request;
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;

    // Log the request
    this.logger.debug(`${method} ${url} [${controllerName}.${handlerName}]`, {
      body: this.sanitizeData(body),
      params,
      query,
    });

    const startTime = Date.now();
    
    // Process the request and log the response
    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          this.logger.debug(`Response [${responseTime}ms]: ${method} ${url}`, {
            responseData: this.sanitizeData(data),
            responseTime,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(`Error [${responseTime}ms]: ${method} ${url}`, error.stack, {
            error: {
              name: error.name,
              message: error.message,
              code: error.code,
            },
            responseTime,
          });
        },
      }),
    );
  }

  /**
   * Sanitize sensitive data from logs
   * @param data Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // For simple objects, we can just return a placeholder
    if (typeof data !== 'object') {
      return data;
    }
    
    // For arrays, sanitize each item
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    // For large response objects, just return a summary
    if (JSON.stringify(data).length > 1000) {
      return {
        _summary: `Large response (${JSON.stringify(data).length} bytes)`,
        _type: data.constructor.name,
      };
    }
    
    return data;
  }
} 