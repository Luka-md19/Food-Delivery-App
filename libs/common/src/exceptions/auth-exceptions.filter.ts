import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import { TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';
import { MongoError } from 'mongodb';

/**
 * Error codes that can be used in the application
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_INVALID = 'AUTH_003',
  TOKEN_BLACKLISTED = 'AUTH_004',
  TOKEN_MISSING = 'AUTH_005',
  REFRESH_TOKEN_INVALID = 'AUTH_006',
  ACCOUNT_LOCKED = 'AUTH_007',
  ACCOUNT_DISABLED = 'AUTH_008',
  EMAIL_NOT_VERIFIED = 'AUTH_009',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'AUTH_101',
  
  // User management errors
  USER_NOT_FOUND = 'AUTH_201',
  EMAIL_ALREADY_EXISTS = 'AUTH_202',
  INVALID_RESET_TOKEN = 'AUTH_203',
  RESET_TOKEN_EXPIRED = 'AUTH_204',
  PASSWORD_MISMATCH = 'AUTH_205',
  
  // Database errors
  DATABASE_ERROR = 'AUTH_301',
  DATABASE_CONSTRAINT_ERROR = 'AUTH_302',
  ENTITY_NOT_FOUND = 'AUTH_303',
  
  // General errors
  VALIDATION_ERROR = 'AUTH_401',
  INTERNAL_SERVER_ERROR = 'AUTH_501'
}

/**
 * Standardized error response format
 */
interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: any[];
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Comprehensive exception filter for auth service
 * This catches all exceptions and formats them into a consistent response format
 */
@Catch()
export class AuthExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    // Extract request ID if available
    const requestId = request.headers['x-request-id'] || '';
    
    // Initialize response object
    let errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: requestId,
    };
    
    // Process different types of exceptions
    if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      errorResponse = this.handleHttpException(exception, errorResponse);
    } else if (exception instanceof TokenExpiredError || 
               exception instanceof JsonWebTokenError || 
               exception instanceof NotBeforeError) {
      // Handle JWT errors
      errorResponse = this.handleJwtError(exception, errorResponse);
    } else if (exception instanceof QueryFailedError || 
               exception instanceof EntityNotFoundError || 
               exception instanceof TypeORMError) {
      // Handle TypeORM errors
      errorResponse = this.handleDatabaseError(exception, errorResponse);
    } else if (exception instanceof MongoError) {
      // Handle MongoDB errors
      errorResponse = this.handleMongoError(exception, errorResponse);
    } else {
      // Handle unknown errors
      errorResponse = this.handleUnknownError(exception, errorResponse);
    }
    
    // Log the error
    this.logError(exception, errorResponse);
    
    // Send the response
    response.status(errorResponse.statusCode).json(errorResponse);
  }
  
  /**
   * Handle NestJS HTTP exceptions
   */
  private handleHttpException(exception: HttpException, errorResponse: ErrorResponse): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;
    
    errorResponse.statusCode = status;
    errorResponse.message = typeof exceptionResponse === 'object' 
      ? exceptionResponse.message || exception.message
      : exception.message;
    
    // Add validation errors if available
    if (typeof exceptionResponse === 'object' && exceptionResponse.errors) {
      errorResponse.errors = exceptionResponse.errors;
    }
    
    // Set appropriate error code
    if (exception instanceof UnauthorizedException) {
      errorResponse.code = ErrorCode.INVALID_CREDENTIALS;
    } else if (exception instanceof BadRequestException) {
      errorResponse.code = ErrorCode.VALIDATION_ERROR;
    } else if (exception instanceof ForbiddenException) {
      errorResponse.code = ErrorCode.INSUFFICIENT_PERMISSIONS;
    } else if (exception instanceof NotFoundException) {
      errorResponse.code = ErrorCode.USER_NOT_FOUND;
    } else if (exception instanceof InternalServerErrorException) {
      errorResponse.code = ErrorCode.INTERNAL_SERVER_ERROR;
    }
    
    return errorResponse;
  }
  
  /**
   * Handle JWT-related errors
   */
  private handleJwtError(exception: Error, errorResponse: ErrorResponse): ErrorResponse {
    errorResponse.statusCode = HttpStatus.UNAUTHORIZED;
    
    if (exception instanceof TokenExpiredError) {
      errorResponse.code = ErrorCode.TOKEN_EXPIRED;
      errorResponse.message = 'Authentication token has expired';
    } else if (exception instanceof JsonWebTokenError) {
      errorResponse.code = ErrorCode.TOKEN_INVALID;
      errorResponse.message = 'Invalid authentication token';
    } else if (exception instanceof NotBeforeError) {
      errorResponse.code = ErrorCode.TOKEN_INVALID;
      errorResponse.message = 'Token not yet valid';
    }
    
    return errorResponse;
  }
  
  /**
   * Handle database-related errors
   */
  private handleDatabaseError(exception: Error, errorResponse: ErrorResponse): ErrorResponse {
    errorResponse.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorResponse.code = ErrorCode.DATABASE_ERROR;
    
    if (exception instanceof QueryFailedError) {
      // PostgreSQL constraint error
      const queryError = exception as any;
      
      if (queryError.code === '23505') { // Unique violation
        errorResponse.statusCode = HttpStatus.CONFLICT;
        errorResponse.code = ErrorCode.EMAIL_ALREADY_EXISTS;
        errorResponse.message = 'Email address already in use';
      } else {
        errorResponse.message = 'Database query failed';
      }
    } else if (exception instanceof EntityNotFoundError) {
      errorResponse.statusCode = HttpStatus.NOT_FOUND;
      errorResponse.code = ErrorCode.ENTITY_NOT_FOUND;
      errorResponse.message = 'Resource not found';
    } else {
      errorResponse.message = 'Database error occurred';
    }
    
    return errorResponse;
  }
  
  /**
   * Handle MongoDB errors
   */
  private handleMongoError(exception: MongoError, errorResponse: ErrorResponse): ErrorResponse {
    errorResponse.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorResponse.code = ErrorCode.DATABASE_ERROR;
    
    // Handle specific MongoDB error codes
    if (exception.code === 11000) { // Duplicate key error
      errorResponse.statusCode = HttpStatus.CONFLICT;
      errorResponse.code = ErrorCode.EMAIL_ALREADY_EXISTS;
      errorResponse.message = 'Email address already in use';
    } else {
      errorResponse.message = 'Database error occurred';
    }
    
    return errorResponse;
  }
  
  /**
   * Handle unknown errors
   */
  private handleUnknownError(exception: any, errorResponse: ErrorResponse): ErrorResponse {
    // Log the error
    this.logger.error(
      `Unhandled exception: ${exception.message}`,
      exception.stack
    );
    
    // Special handling for common error messages
    if (exception instanceof Error) {
      // Handle "Invalid credentials" error
      if (exception.message === 'Invalid credentials' || exception.message.includes('Invalid credentials')) {
        errorResponse.statusCode = HttpStatus.UNAUTHORIZED;
        errorResponse.code = ErrorCode.INVALID_CREDENTIALS;
        errorResponse.message = 'Invalid credentials';
        return errorResponse;
      }
      
      // Handle "Email not verified" error
      if (exception.message === 'Email not verified' || exception.message.includes('not verified')) {
        errorResponse.statusCode = HttpStatus.UNAUTHORIZED;
        errorResponse.code = ErrorCode.EMAIL_NOT_VERIFIED;
        errorResponse.message = 'Email address is not verified';
        return errorResponse;
      }
      
      // Handle "Account locked" error
      if (exception.message === 'Account is locked' || exception.message.includes('locked')) {
        errorResponse.statusCode = HttpStatus.UNAUTHORIZED;
        errorResponse.code = ErrorCode.ACCOUNT_LOCKED;
        errorResponse.message = 'Account is locked due to too many failed attempts';
        return errorResponse;
      }
    }
    
    return errorResponse;
  }
  
  /**
   * Log error details
   */
  private logError(exception: any, errorResponse: ErrorResponse): void {
    const logMessage = `
      Error: ${exception.message}
      Code: ${errorResponse.code}
      Path: ${errorResponse.path}
      Request ID: ${errorResponse.requestId || 'not provided'}
      Status: ${errorResponse.statusCode}
    `;
    
    if (errorResponse.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, exception.stack);
    } else if (errorResponse.statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }
} 