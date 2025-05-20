import { HttpStatus } from '@nestjs/common';
import { MenuDomainException } from './menu-domain.exception';

/**
 * Exception thrown when a resource conflict occurs
 */
export class ResourceConflictException extends MenuDomainException {
  constructor(resource: string, identifier: string, reason: string) {
    super(`Resource conflict for ${resource} with identifier ${identifier}: ${reason}`, HttpStatus.CONFLICT);
  }
} 