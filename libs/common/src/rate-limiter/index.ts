/**
 * Rate Limiter Module for NestJS
 * Provides comprehensive rate limiting functionality with dynamic configuration
 */

// Core module exports from throttler.module.ts
export { 
  ThrottlerModule, 
  ThrottlerModuleOptions, 
  ThrottlerModuleAsyncOptions,
  ThrottlerOptionsFactory,
  ThrottlerStorageType, 
  ThrottlerAsyncOptions
} from './throttler.module';

// Constants - explicitly export to avoid conflicts
export { THROTTLER_OPTIONS, THROTTLER_OPTIONS_FACTORY } from './constants/tokens';

// Configuration exports
export * from './constants/rate-limit-configs';
export * from './constants/helper-functions';

// Exception filters
export * from './filters/rate-limit-exception.filter';
export * from './filters';

// Interceptors
export * from './interceptors/rate-limit.interceptor';
export * from './interceptors';

// Storage implementations
export * from './storage/memory-throttler.storage';
export { 
  RedisThrottlerStorage, 
  REDIS_THROTTLER_OPTIONS, 
  RedisThrottlerStorageOptions, 
  ThrottlerStorageRecord 
} from './storage/redis-throttler.storage';
export { DisabledThrottlerStorage } from './storage/disabled-throttler.storage';
// Don't export everything from storage to prevent conflicts
// export * from './storage';

// Decorators
export * from './decorators/dynamic-rate-limit.decorator';
export * from './decorators';

// Guards
export * from './guards/dynamic-rate-limiter.guard';
export * from './guards';

// Service exports
export * from './services/dynamic-rate-limiter.service';
export * from './services';

// Type exports
export * from './types';

// We're now directly exporting DisabledThrottlerStorage above so don't need this
// export * from './disable-for-test';
