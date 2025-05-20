import { SetMetadata } from '@nestjs/common';

/**
 * Skip rate limiting for a controller or route
 * @returns Decorator
 */
export const SkipRateLimit = () => SetMetadata('skipRateLimit', true); 