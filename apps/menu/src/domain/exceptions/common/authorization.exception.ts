import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when an operation is not authorized
 */
export class AuthorizationException extends MenuDomainException {
  constructor(operation: string, resource: string) {
    super(`Not authorized to ${operation} on ${resource}`, HttpStatus.FORBIDDEN);
  }
} 