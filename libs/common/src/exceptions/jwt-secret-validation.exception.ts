import { HttpException, HttpStatus } from '@nestjs/common';

export class JwtSecretValidationException extends HttpException {
  constructor(message: string = 'JWT secret validation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
} 