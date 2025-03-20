import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MenuDomainException } from '../domain/exceptions/common/menu-domain.exception';

/**
 * Global exception filter that handles all exceptions in a consistent way
 * This ensures that all error responses follow the same format
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let timestamp = new Date().toISOString();
    let path = request.url;
    
    // Handle domain exceptions
    if (exception instanceof MenuDomainException) {
      status = exception.getStatus();
      message = exception.message;
      error = HttpStatus[status];
    } 
    // Handle HTTP exceptions
    else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;
      status = exception.getStatus();
      
      // If the exception response has a message, use it
      if (exceptionResponse && typeof exceptionResponse === 'object') {
        message = exceptionResponse.message || message;
        error = exceptionResponse.error || HttpStatus[status];
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }
    
    // Log the exception
    this.logger.error(`${message} - ${request.method} ${request.url}`, 
      exception instanceof Error ? exception.stack : 'No stack trace');
    
    // Return a consistent error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp,
      path,
    });
  }
} 