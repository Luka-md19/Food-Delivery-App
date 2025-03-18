import { Injectable, Logger } from '@nestjs/common';

/**
 * Base service class providing common functionality for all services
 * This is now mostly a compatibility layer as the functionality has moved
 * to more specialized services in apps/menu/src/common/errors
 */
@Injectable()
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly DEFAULT_TIMEOUT = 5000;

  constructor(contextName: string) {
    this.logger = new Logger(contextName);
  }

  /**
   * Validate that a string is a valid ObjectId
   * @param id The ID to validate
   * @throws BadRequestException if ID is invalid
   * @deprecated Use ValidatorService instead
   */
  protected validateObjectId(id: string): void {
    // This is kept for backward compatibility
    // You should use apps/menu/src/common/errors/validator.service.ts instead
    if (!id) {
      throw new Error('ID is required');
    }
    
    // Simple validation for backward compatibility
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error(`Invalid ID format: ${id}`);
    }
  }

  /**
   * Standardize pagination parameters
   * @param page Page number (1-indexed)
   * @param limit Number of items per page
   * @param maxLimit Maximum allowed limit
   * @returns Normalized pagination parameters
   * @deprecated Use ValidatorService instead
   */
  protected validatePagination(page = 1, limit = 10, maxLimit = 100): { page: number, limit: number } {
    // This is kept for backward compatibility
    // You should use apps/menu/src/common/errors/validator.service.ts instead
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > maxLimit) limit = maxLimit; // Prevent excessive data retrieval
    
    return { page, limit };
  }

  /**
   * Handle and log errors with consistent pattern
   * @param error The error to handle
   * @param message A descriptive message for the error
   * @param knownErrorTypes Array of error types that should be rethrown as-is
   * @returns Never completes normally
   * @deprecated Use ErrorHandlerService instead
   */
  protected handleError<T>(error: any, message: string, knownErrorTypes: any[] = []): T {
    // This is kept for backward compatibility
    // You should use apps/menu/src/common/errors/error-handler.service.ts instead
    
    // If the error is one of the known error types, rethrow it
    if (knownErrorTypes.some(errorType => error instanceof errorType)) {
      throw error;
    }
    
    this.logger.error(`${message}: ${error.message}`, error.stack);
    throw new Error(message);
  }
} 