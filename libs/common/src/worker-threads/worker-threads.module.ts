import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { ThreadPoolService } from './thread-pool.service';

/**
 * Options for configuring the ThreadPoolModule
 */
export interface ThreadPoolOptions {
  /**
   * Number of worker threads to create (default: CPU count - 1, min: 1, max: based on environment)
   */
  maxWorkers?: number;
}

/**
 * Module for integrating worker threads into NestJS
 */
@Global()
@Module({})
export class WorkerThreadsModule {
  /**
   * Register the module with default options
   */
  static register(): DynamicModule {
    return {
      module: WorkerThreadsModule,
      imports: [ConfigModule],
      providers: [ThreadPoolService],
      exports: [ThreadPoolService],
    };
  }

  /**
   * Register the module with custom options
   */
  static registerAsync(options?: ThreadPoolOptions): DynamicModule {
    const providers = [
      {
        provide: 'WORKER_THREADS_OPTIONS',
        useValue: options || {},
      },
      ThreadPoolService,
    ];

    return {
      module: WorkerThreadsModule,
      imports: [ConfigModule],
      providers,
      exports: [ThreadPoolService],
    };
  }
} 