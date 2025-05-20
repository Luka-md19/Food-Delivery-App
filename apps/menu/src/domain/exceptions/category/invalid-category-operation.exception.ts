import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from '../common/menu-domain.exception';

/**
 * Exception thrown when an invalid operation is attempted on a category
 */
export class InvalidCategoryOperationException extends MenuDomainException {
  constructor(operation: string, categoryId: string, reason: string) {
    super(`Invalid operation '${operation}' on category ${categoryId}: ${reason}`, HttpStatus.BAD_REQUEST);
  }
} 