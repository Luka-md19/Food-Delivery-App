/**
 * Injection token for throttler options
 */
export const THROTTLER_OPTIONS = 'THROTTLER_OPTIONS';

/**
 * Injection token for throttler options factory
 */
export const THROTTLER_OPTIONS_FACTORY = 'THROTTLER_OPTIONS_FACTORY';

/**
 * Storage types for rate limiting
 */
export enum ThrottlerStorageType {
  MEMORY = 'memory',
  REDIS = 'redis',
} 