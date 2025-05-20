import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from '../common/menu-domain.exception';

/**
 * Exception thrown when an invalid operation is attempted on a menu item
 */
export class InvalidMenuItemOperationException extends MenuDomainException {
  constructor(operation: string, menuItemId: string, reason: string) {
    super(`Invalid operation '${operation}' on menu item ${menuItemId}: ${reason}`, HttpStatus.BAD_REQUEST);
  }
} 