import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when a category is not found
 */
export class CategoryNotFoundException extends MenuDomainException {
  constructor(categoryId: string, menuId?: string) {
    const message = menuId 
      ? `Category with ID ${categoryId} not found in menu ${menuId}`
      : `Category with ID ${categoryId} not found`;
    
    super(message, HttpStatus.NOT_FOUND);
  }
} 