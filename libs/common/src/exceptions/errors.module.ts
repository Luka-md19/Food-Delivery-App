import { Module } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { ValidatorService } from './validator.service';
import { ExceptionHandler } from './exception-handler.class';

@Module({
  providers: [
    {
      provide: ErrorHandlerService,
      useFactory: () => {
        // Create a new ExceptionHandler instance to ensure it's properly initialized
        const exceptionHandler = new ExceptionHandler();
        
        // Set the global ExceptionHandler object if it's not already set
        if (!(global as any).ExceptionHandler) {
          (global as any).ExceptionHandler = exceptionHandler;
        } else {
          // Ensure all required properties exist
          if (!(global as any).ExceptionHandler.name) {
            (global as any).ExceptionHandler.name = 'ExceptionHandler';
          }
          if (!(global as any).ExceptionHandler.catch) {
            (global as any).ExceptionHandler.catch = function() {};
          }
          if (!(global as any).ExceptionHandler.next) {
            (global as any).ExceptionHandler.next = function() {};
          }
          if (!(global as any).ExceptionHandler.toString) {
            (global as any).ExceptionHandler.toString = () => 'ExceptionHandler';
          }
        }
        
        return new ErrorHandlerService('ExceptionHandler');
      }
    },
    ValidatorService
  ],
  exports: [
    ErrorHandlerService,
    ValidatorService
  ]
})
export class ErrorsModule {} 