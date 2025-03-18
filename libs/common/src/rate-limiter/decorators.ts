import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_CONFIGS } from './constants';

/**
 * Skip rate limiting for a controller or route
 * @returns Decorator
 */
export const SkipRateLimit = () => SetMetadata('skipRateLimit', true);

/**
 * Apply a predefined rate limit configuration to a controller or route
 * @param service The service name (e.g., 'AUTH', 'MENU')
 * @param endpoint The endpoint name (e.g., 'login', 'register')
 * @returns Decorator
 */
export const RateLimit = (service: keyof typeof RATE_LIMIT_CONFIGS, endpoint: string) => {
  const config = RATE_LIMIT_CONFIGS[service]?.[endpoint];
  
  if (!config) {
    throw new Error(`Rate limit configuration not found for ${service}.${endpoint}`);
  }
  
  console.log(`Applying rate limit for ${service}.${endpoint}: limit=${config.limit}, ttl=${config.ttl}s`);
  
  return SetMetadata('throttle', {
    limit: config.limit,
    ttl: config.ttl * 1000, // Convert to milliseconds
  });
};

/**
 * Apply a custom rate limit to a controller or route
 * @param limit The maximum number of requests
 * @param ttl The time-to-live in seconds
 * @returns Decorator
 */
export const CustomRateLimit = (limit: number, ttl: number) => {
  return SetMetadata('throttle', {
    limit,
    ttl: ttl * 1000, // Convert to milliseconds
  });
};

/**
 * Apply a strict rate limit to a controller or route (5 requests per minute)
 * @returns Decorator
 */
export const StrictRateLimit = () => {
  return SetMetadata('throttle', {
    limit: RATE_LIMIT_CONFIGS.DEFAULT.strict.limit,
    ttl: RATE_LIMIT_CONFIGS.DEFAULT.strict.ttl * 1000,
  });
};

/**
 * Apply a standard rate limit to a controller or route (20 requests per minute)
 * @returns Decorator
 */
export const StandardRateLimit = () => {
  return SetMetadata('throttle', {
    limit: RATE_LIMIT_CONFIGS.DEFAULT.standard.limit,
    ttl: RATE_LIMIT_CONFIGS.DEFAULT.standard.ttl * 1000,
  });
};

/**
 * Apply a relaxed rate limit to a controller or route (50 requests per minute)
 * @returns Decorator
 */
export const RelaxedRateLimit = () => {
  return SetMetadata('throttle', {
    limit: RATE_LIMIT_CONFIGS.DEFAULT.relaxed.limit,
    ttl: RATE_LIMIT_CONFIGS.DEFAULT.relaxed.ttl * 1000,
  });
}; 