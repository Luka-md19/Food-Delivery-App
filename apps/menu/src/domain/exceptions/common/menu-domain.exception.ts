import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all menu domain exceptions
 * This provides a consistent way to handle domain-specific errors
 */
export class MenuDomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({
      statusCode: status,
      message,
      error: 'Menu Domain Error',
      timestamp: new Date().toISOString(),
    }, status);
  }
} 