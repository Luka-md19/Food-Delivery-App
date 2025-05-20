import { BaseException } from '../../../exceptions/base.exception';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown by repository operations
 */
export class BaseRepositoryException extends BaseException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
} 