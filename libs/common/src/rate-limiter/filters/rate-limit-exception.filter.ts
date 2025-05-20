import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { LoggerFactory } from '../../logger/logger.factory';
import { ErrorHandlerService } from '../../exceptions/error-handler.service';

/**
 * Exception filter for handling rate limit exceeded errors
 * This follows the Single Responsibility Principle by focusing only on handling rate limit exceptions
 */
@Injectable()
@Catch(HttpException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  private readonly logger = LoggerFactory.getLogger('RateLimitExceptionFilter');
  private readonly errorHandler: ErrorHandlerService;

  constructor() {
    this.errorHandler = new ErrorHandlerService('RateLimitExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost): any {
    // Get request context
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const { method, originalUrl, ip } = request;

    // Only handle rate limit exceptions (429 Too Many Requests)
    if (status !== HttpStatus.TOO_MANY_REQUESTS) {
      // Pass other exceptions through
      if (response && typeof response.status === 'function') {
        response.status(status).json(exception.getResponse());
      }
      return;
    }

    this.logger.warn(`Rate limit exceeded for ${method} ${originalUrl} from ${ip}`);

    // Extract info from the exception
    const exceptionResponse = exception.getResponse() as any;
    const retryAfter = exceptionResponse.retryAfter || 60; // Default to 60 seconds if not specified
    const message = exceptionResponse.message || 'Too Many Requests';
    const path = exceptionResponse.path || request.url || '/';
    const timestamp = exceptionResponse.timestamp || new Date().toISOString();

    // Prepare a response object
    const responseBody = {
      statusCode: status,
      message: message,
      error: 'Rate limit exceeded',
      path: path,
      timestamp: timestamp,
      retryAfter: retryAfter
    };

    try {
      // Check if we can use the response object
      if (response && typeof response.header === 'function' && !response.headersSent) {
        // Set standard rate limiting headers
        response.header('Retry-After', String(retryAfter));
        
        // Ensure CORS headers are properly set
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.header('Access-Control-Expose-Headers', 'Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
        
        // Send the response with all headers and body
        return response.status(status).json(responseBody);
      } else {
        // For non-HTTP contexts or edge cases
        this.logger.warn(`Non-HTTP context or response unavailable/already sent, rate limit not properly handled for ${method} ${path}`);
        return responseBody;
      }
    } catch (error) {
      this.logger.error(`Error handling rate limit exception: ${error.message}`, error.stack);
      
      // Still attempt to send a response if possible
      try {
        if (response && typeof response.status === 'function' && !response.headersSent) {
          response.header('Access-Control-Allow-Origin', '*');
          return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too Many Requests',
            error: 'Rate limit exceeded',
            retryAfter: retryAfter
          });
        }
      } catch (innerError) {
        this.logger.error(`Secondary error in rate limit handling: ${innerError.message}`);
      }
      
      // If we can't handle it properly, at least return something
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too Many Requests',
        retryAfter: retryAfter
      };
    }
  }
} 