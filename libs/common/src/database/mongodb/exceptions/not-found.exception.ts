import { BaseRepositoryException } from './base-repository.exception';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested entity is not found
 */
export class NotFoundException extends BaseRepositoryException {
  constructor(message: string) {
    super(message);
  }
} 