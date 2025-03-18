import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when a menu is not found
 */
export class MenuNotFoundException extends MenuDomainException {
  constructor(menuId: string) {
    super(`Menu with ID ${menuId} not found`, HttpStatus.NOT_FOUND);
  }
} 