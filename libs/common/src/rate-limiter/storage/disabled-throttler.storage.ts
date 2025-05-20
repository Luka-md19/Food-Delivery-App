import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { LoggerFactory } from '../../logger/logger.factory';
import { ThrottlerStorageRecord } from './redis-throttler.storage';

/**
 * Implementation of ThrottlerStorage that disables rate limiting
 * This class is used during load testing to bypass rate limits
 */
@Injectable()
export class DisabledThrottlerStorage implements ThrottlerStorage {
  private readonly logger = LoggerFactory.getLogger('DisabledThrottlerStorage');

  constructor() {
    this.logger.log('Disabled throttler storage initialized - rate limiting is bypassed for load testing');
  }
  
  /**
   * Increment method that always returns a non-rate-limited result
   * @param key The rate limiting key
   * @param ttl Time to live in seconds
   * @param limit The rate limit threshold
   * @param blockDuration Time to block in seconds
   * @param throttlerName Name of the throttler
   */
  async increment(
    key: string, 
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    // Return a fake hit count that is always well below any limit
    return {
      totalHits: 1, // Always return a small number of hits
      timeToExpire: ttl * 1000, // Convert to milliseconds
      isBlocked: false,
      timeToBlockExpire: 0
    };
  }
} 