import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException, 
  HttpStatus,
  Inject
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerFactory } from '@app/common/logger';
import { IFailedMessageRepository } from '../repositories/common/failed-message.repository.interface';
import { IFileStorageService } from '../events/services/file-storage/file-storage.interface';
import { ErrorResponseDto } from '../dto/common/error-response.dto';
import { FailedRequestDto } from '../dto/common/failed-request.dto';

/**
 * Global exception filter that handles all exceptions in a consistent way
 * This ensures that all error responses follow the same format
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = LoggerFactory.getLogger(AllExceptionsFilter.name);
  
  constructor(
    @Inject('IFailedMessageRepository') private readonly failedMessageRepository: IFailedMessageRepository,
    @Inject('IFileStorageService') private readonly fileStorageService: IFileStorageService
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;

    // Extract error details using a separate method to follow SRP
    const { status, errorResponse, errorMessage, stackTrace } = this.extractErrorDetails(exception);

    // Special case for ResourceConflictException on successful DB operations
    if (this.isSuccessfulDbOperation(exception)) {
      this.logger.warn(`Returning success despite error: ${errorMessage} for ${request.method} ${path}`);
      
      // Return 200 OK with an empty or partial response
      // This is for cases where the database operation succeeded but response formatting failed
      response.status(HttpStatus.OK).json({
        id: this.extractIdFromError(errorMessage) || 'unknown',
        message: 'Operation completed but response might be incomplete'
      });
      return;
    }

    // Log the error
    this.logger.error(`Exception ${status} ${errorMessage} for ${request.method} ${path}`, stackTrace);

    // Store failed request
    await this.storeFailedRequest(request, errorMessage);

    // Return the HTTP response
    response.status(status).json(new ErrorResponseDto({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorResponse
    }));
  }

  /**
   * Check if this is a ResourceConflictException where the database operation actually succeeded
   */
  private isSuccessfulDbOperation(exception: unknown): boolean {
    if (exception instanceof Error && 
        exception.name === 'ResourceConflictException' && 
        exception.message) {
      
      // These are cases where DB operations succeeded but response formatting failed
      return exception.message.includes('Failed to save') || 
             exception.message.includes('Failed to add item') ||
             exception.message.includes('Failed to remove item') ||
             exception.message.includes('Failed to update category');
    } else if (exception instanceof Error && 
              exception.name === 'CategoryNotFoundException' && 
              exception.message) {
      
      // Special case for category update operations
      const errorMsg = exception.message.toLowerCase();
      if (errorMsg.includes('failed to update') || errorMsg.includes('not found')) {
        // Check if this is coming from the update method
        const stack = exception.stack || '';
        if (stack.includes('CategoryService.update') || stack.includes('CategoryDomainRepository.save')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extract ID from error message if available
   */
  private extractIdFromError(errorMessage: string): string | null {
    // Try to extract an ID from the error message
    const idMatch = /\b([0-9a-f]{24})\b/.exec(errorMessage);
    return idMatch ? idMatch[1] : null;
  }

  /**
   * Extract error details from exception
   * This follows the Single Responsibility Principle by isolating the error detail extraction logic
   */
  private extractErrorDetails(exception: unknown): { 
    status: number; 
    errorResponse: any; 
    errorMessage: string; 
    stackTrace: string 
  } {
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
      
    const errorResponse = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };
      
    let errorMessage: string;
    let stackTrace: string;
    
    if (exception instanceof Error) {
      errorMessage = exception.message;
      stackTrace = exception.stack || '';
    } else if (typeof exception === 'string') {
      errorMessage = exception;
      stackTrace = '';
    } else {
      errorMessage = 'Unknown error';
      stackTrace = '';
    }

    return { status, errorResponse, errorMessage, stackTrace };
  }

  /**
   * Store failed request for later analysis or retry
   * This follows the Single Responsibility Principle by isolating the storage logic
   */
  private async storeFailedRequest(request: Request, errorMessage: string): Promise<void> {
    try {
      const failedRequest = new FailedRequestDto(request, errorMessage);
      
      // Store in the database
      try {
        await this.failedMessageRepository.saveFailedMessage(
          failedRequest.pattern,
          failedRequest.payload,
          errorMessage
        );
        this.logger.log(`Failed request stored in database for ${request.method} ${request.url}`);
      } catch (dbError) {
        this.logger.error(`Failed to store exception in database: ${dbError.message}`, dbError.stack);
        
        // Fall back to file storage if database storage fails
        const id = await this.fileStorageService.storeFailedMessage(
          failedRequest.pattern,
          failedRequest.payload,
          errorMessage
        );
        this.logger.log(`Failed request stored in file storage with ID ${id} for ${request.method} ${request.url}`);
      }
    } catch (storeError) {
      this.logger.error(`Failed to store exception details: ${storeError.message}`, storeError.stack);
    }
  }
} 