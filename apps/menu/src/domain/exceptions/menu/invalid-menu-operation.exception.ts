import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from '../common/menu-domain.exception';

/**
 * Exception thrown when an invalid operation is attempted on a menu
 */
export class InvalidMenuOperationException extends MenuDomainException {
  constructor(operation: string, menuId: string, reason: string) {
    super(`Invalid operation '${operation}' on menu ${menuId}: ${reason}`, HttpStatus.BAD_REQUEST);
  }
} 