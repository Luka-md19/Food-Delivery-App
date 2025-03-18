import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * In-memory storage for throttler that properly tracks and decrements rate limits
 */
@Injectable()
export class MemoryThrottlerStorage implements ThrottlerStorage {
  private readonly logger = LoggerFactory.getLogger('MemoryThrottlerStorage');
  private readonly storage: Record<string, { hits: number; expires: number; blocked?: number }> = {};

  constructor() {
    this.logger.log('Memory throttler storage initialized');
    
    // Clean up expired keys periodically
    setInterval(() => this.cleanupExpiredKeys(), 60000);
  }

  /**
   * Increment the number of requests for a given key
   * @param key The unique key for this request
   * @param ttl The time-to-live for this key in milliseconds
   * @param limit The maximum number of requests allowed within the TTL
   * @param blockDuration The duration to block requests after exceeding the limit
   * @param name The name of the throttler
   * @returns The throttler result with hit count and time information
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration?: number,
    name?: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const now = Date.now();
    
    // Check if the key is blocked
    if (this.storage[key]?.blocked && this.storage[key].blocked > now) {
      const timeToBlockExpire = Math.ceil((this.storage[key].blocked - now) / 1000);
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire,
      };
    }
    
    // If the key exists and hasn't expired, increment the hits
    if (this.storage[key] && this.storage[key].expires > now) {
      this.storage[key].hits++;
      
      const timeToExpire = Math.ceil((this.storage[key].expires - now) / 1000);
      
      // If the hits exceed the limit, block the key
      if (this.storage[key].hits > limit && blockDuration) {
        this.storage[key].blocked = now + blockDuration;
        return {
          totalHits: this.storage[key].hits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }
      
      return {
        totalHits: this.storage[key].hits,
        timeToExpire,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
    
    // If the key doesn't exist or has expired, create a new entry
    this.storage[key] = {
      hits: 1,
      expires: now + ttl,
    };
    
    return {
      totalHits: 1,
      timeToExpire: Math.ceil(ttl / 1000),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /**
   * Clean up expired keys to prevent memory leaks
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    let cleanedKeys = 0;
    
    for (const key in this.storage) {
      if (this.storage[key].expires < now && (!this.storage[key].blocked || this.storage[key].blocked < now)) {
        delete this.storage[key];
        cleanedKeys++;
      }
    }
    
    if (cleanedKeys > 0) {
      this.logger.debug(`Cleaned up ${cleanedKeys} expired throttler keys`);
    }
  }
} 