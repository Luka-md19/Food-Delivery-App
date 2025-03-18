import { Module } from '@nestjs/common';
import { ErrorHandlerService, ValidatorService } from './index';

@Module({
  providers: [
    ErrorHandlerService,
    ValidatorService
  ],
  exports: [
    ErrorHandlerService,
    ValidatorService
  ]
})
export class ErrorsModule {} 