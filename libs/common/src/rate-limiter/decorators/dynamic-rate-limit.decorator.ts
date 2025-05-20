import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_CONFIGS } from '../constants/rate-limit-configs';


/**
 * Apply a dynamic rate limit to a controller or route
 * This decorator marks the endpoint for dynamic rate limiting
 * The actual limit will be calculated at runtime based on various factors
 * 
 * @param service The service name (e.g., 'AUTH', 'MENU')
 * @param endpoint The endpoint name (e.g., 'login', 'register')
 * @returns Decorator
 */
export const DynamicRateLimit = (service: keyof typeof RATE_LIMIT_CONFIGS, endpoint: string) => {
  // Store the service and endpoint name for the DynamicRateLimiterGuard to use
  return SetMetadata('dynamicRateLimit', { service, endpoint });
}; 