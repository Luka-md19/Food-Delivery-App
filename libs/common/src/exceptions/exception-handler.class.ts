/**
 * A formal class for ExceptionHandler that NestJS relies on
 * This addresses the "Cannot read properties of undefined (reading 'name')" error
 * that occurs during NestJS initialization
 */
export class ExceptionHandler {
  constructor(public readonly name: string = 'ExceptionHandler') {}
  
  /**
   * Catches an exception - this is a placeholder implementation
   * to satisfy NestJS internal requirements
   */
  catch(): void {}
  
  /**
   * Calls the next handler - this is a placeholder implementation
   * to satisfy NestJS internal requirements
   */
  next(): void {}
  
  /**
   * String representation of the handler
   */
  toString(): string {
    return 'ExceptionHandler';
  }
  
  /**
   * Static initializer to ensure the global ExceptionHandler is available
   */
  static {
    if (!(global as any).ExceptionHandler) {
      (global as any).ExceptionHandler = new ExceptionHandler();
    } else if (!(global as any).ExceptionHandler.name) {
      // Add required properties if object exists but is incomplete
      (global as any).ExceptionHandler.name = 'ExceptionHandler';
      (global as any).ExceptionHandler.toString = () => 'ExceptionHandler';
      (global as any).ExceptionHandler.catch = function() {};
      (global as any).ExceptionHandler.next = function() {};
    }
  }
} 