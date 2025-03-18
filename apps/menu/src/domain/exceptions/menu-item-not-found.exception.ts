import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when a menu item is not found
 */
export class MenuItemNotFoundException extends MenuDomainException {
  constructor(menuItemId: string, categoryId?: string) {
    const message = categoryId 
      ? `Menu item with ID ${menuItemId} not found in category ${categoryId}`
      : `Menu item with ID ${menuItemId} not found`;
    
    super(message, HttpStatus.NOT_FOUND);
  }
} 