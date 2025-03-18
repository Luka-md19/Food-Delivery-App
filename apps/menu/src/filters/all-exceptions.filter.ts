import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MenuDomainException } from '../domain/exceptions/menu-domain.exception';

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
    
    // Handle different types of exceptions
    if (exception instanceof MenuDomainException) {
      // Domain exceptions already have the correct format
      const exceptionResponse = exception.getResponse() as any;
      status = exception.getStatus();
      message = exceptionResponse.message;
      error = exceptionResponse.error;
    } else if (exception instanceof HttpException) {
      // Standard NestJS exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }
    } else if (exception instanceof Error) {
      // Standard JavaScript errors
      message = exception.message;
    }
    
    // Log the exception
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception instanceof Error ? exception.stack : 'No stack trace'
    );
    
    // Return a standardized error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
} 