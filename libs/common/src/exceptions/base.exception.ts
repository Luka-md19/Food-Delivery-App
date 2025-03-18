import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(
      {
        statusCode: status,
        message,
        error: HttpStatus[status],
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
} 