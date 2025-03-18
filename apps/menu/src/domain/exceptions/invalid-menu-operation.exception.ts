import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when an invalid operation is attempted on a menu
 */
export class InvalidMenuOperationException extends MenuDomainException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
} 