import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when validation fails in the domain
 */
export class ValidationException extends MenuDomainException {
  constructor(field: string, reason: string) {
    super(`Validation failed for ${field}: ${reason}`, HttpStatus.BAD_REQUEST);
  }
} 