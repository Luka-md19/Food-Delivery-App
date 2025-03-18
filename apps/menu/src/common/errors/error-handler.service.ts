import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';

/**
 * A service dedicated to handling and formatting errors across the application
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger: Logger;

  constructor(contextName: string) {
    this.logger = new Logger(contextName);
  }

  /**
   * Handle and log errors with consistent pattern
   * @param error The error to handle
   * @param message A descriptive message for the error
   * @param knownErrorTypes Array of error types that should be rethrown as-is
   * @returns Never completes normally
   */
  public handleError<T>(error: any, message: string, knownErrorTypes: any[] = []): T {
    // If the error is one of the known error types, rethrow it
    if (knownErrorTypes.some(errorType => error instanceof errorType)) {
      throw error;
    }
    
    this.logger.error(`${message}: ${error.message}`, error.stack);
    throw new InternalServerErrorException(message);
  }

  /**
   * Log a warning but don't throw an exception
   * @param message Warning message
   * @param error Optional error object
   */
  public logWarning(message: string, error?: any): void {
    if (error) {
      this.logger.warn(`${message}: ${error.message}`, error.stack);
    } else {
      this.logger.warn(message);
    }
  }
  
  /**
   * Log an informational message
   * @param message Info message
   */
  public logInfo(message: string): void {
    this.logger.log(message);
  }
  
  /**
   * Log a debug message
   * @param message Debug message
   * @param data Optional data to include
   */
  public logDebug(message: string, data?: any): void {
    if (data) {
      this.logger.debug(`${message}: ${JSON.stringify(data)}`);
    } else {
      this.logger.debug(message);
    }
  }
} 