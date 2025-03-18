import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ValidationException extends BaseException {
  constructor(message: string = 'Validation failed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
} 