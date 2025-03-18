import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule, Provider } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LOGGER_MODULE_OPTIONS } from './constants';
import { LoggerModuleOptions } from './interfaces';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

/**
 * Logger module for centralized logging
 * This follows the Open/Closed Principle by being open for extension but closed for modification
 */
@Global()
@Module({})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }

  /**
   * Register the logger module with options
   * @param options Logger module options
   * @returns Dynamic module
   */
  static forRoot(options: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LOGGER_MODULE_OPTIONS,
          useValue: options,
        },
        LoggerService,
        LoggingInterceptor,
      ],
      exports: [LoggerService, LoggingInterceptor],
    };
  }

  /**
   * Register the logger module with async options
   * @param options Async module options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => LoggerModuleOptions | Promise<LoggerModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    const loggerOptionsProvider: Provider = {
      provide: LOGGER_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: LoggerModule,
      imports: options.imports || [],
      providers: [
        loggerOptionsProvider,
        LoggerService,
        {
          provide: APP_INTERCEPTOR,
          useClass: LoggingInterceptor,
        },
      ],
      exports: [LoggerService],
    };
  }
} 