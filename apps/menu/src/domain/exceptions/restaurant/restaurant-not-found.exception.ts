import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from '../common/menu-domain.exception';

/**
 * Exception thrown when a restaurant is not found
 */
export class RestaurantNotFoundException extends MenuDomainException {
  constructor(restaurantId: string) {
    super(`Restaurant with ID ${restaurantId} not found`, HttpStatus.NOT_FOUND);
  }
} 