import { ErrorHandlerService } from '@app/common';
import { MenuDomainException } from '../../domain/exceptions';
import { LoggerFactory } from '@app/common/logger';

/**
 * Base class for all event handlers with shared error handling functionality
 */
export abstract class BaseEventHandler {
  protected readonly logger: any;
  protected readonly errorHandler: ErrorHandlerService;

  constructor(contextName: string) {
    this.logger = LoggerFactory.getLogger(contextName);
    this.errorHandler = new ErrorHandlerService(contextName);
  }

  /**
   * Handle domain errors and log them appropriately
   * @param error The error to handle
   * @param message Context message for the error
   */
  protected handleError(error: any, message: string): void {
    if (error instanceof MenuDomainException) {
      // For domain exceptions, we just log them as warnings
      this.logger.warn(`${message}: ${error.message}`);
    } else {
      // For other errors, use the error handler service
      this.logger.error(`${message}: ${error.message}`, error.stack);
    }
  }
} 
