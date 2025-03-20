import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from '../common/menu-domain.exception';

/**
 * Exception thrown when a category is not found
 */
export class CategoryNotFoundException extends MenuDomainException {
  constructor(categoryId: string) {
    super(`Category with ID ${categoryId} not found`, HttpStatus.NOT_FOUND);
  }
} 