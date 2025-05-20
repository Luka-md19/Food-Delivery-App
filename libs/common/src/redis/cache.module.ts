import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisModule } from './redis.module';
import { CacheExampleService } from './cache-example.service';

/**
 * Options for the cache module
 */
export interface CacheModuleOptions {
  /**
   * Whether to register the example service
   * @default false
   */
  registerExampleService?: boolean;
}

/**
 * Dedicated cache module that can be used independently
 * This module follows the Open/Closed principle by allowing extension through options
 */
@Module({})
export class CacheModule {
  /**
   * Register the cache module with basic configuration
   * @returns Dynamic module
   */
  static register(options?: CacheModuleOptions): DynamicModule {
    const providers: Provider[] = [CacheService];
    
    // Optionally register the example service
    if (options?.registerExampleService) {
      providers.push(CacheExampleService);
    }
    
    return {
      module: CacheModule,
      imports: [RedisModule],
      providers,
      exports: providers,
    };
  }
} 