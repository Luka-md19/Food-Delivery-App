import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Exception filter for handling rate limit exceeded errors
 * This follows the Single Responsibility Principle by focusing only on handling rate limit exceptions
 */
@Injectable()
@Catch(HttpException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  private readonly logger = LoggerFactory.getLogger('RateLimitExceptionFilter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const { method, originalUrl, ip } = request;

    // Only handle rate limit exceptions (429 Too Many Requests)
    if (status !== HttpStatus.TOO_MANY_REQUESTS) {
      // Pass other exceptions through
      response.status(status).json(exception.getResponse());
      return;
    }

    this.logger.warn(`Rate limit exceeded for ${method} ${originalUrl} from ${ip}`);

    const exceptionResponse = exception.getResponse() as any;
    const retryAfter = exceptionResponse.retryAfter || 60; // Default to 60 seconds if not specified

    // Set standard rate limiting headers
    response.header('Retry-After', String(retryAfter));
    
    this.logger.debug(`Sending rate limit exceeded response with retry after ${retryAfter}s`);
    
    response.status(status).json({
      statusCode: status,
      message: exceptionResponse.message || 'Too Many Requests',
      error: 'Rate limit exceeded',
      path: request.url,
      timestamp: new Date().toISOString(),
      retryAfter: retryAfter,
    });
  }
} 