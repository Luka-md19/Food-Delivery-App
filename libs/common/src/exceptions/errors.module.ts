import { Module } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { ValidatorService } from './validator.service';

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