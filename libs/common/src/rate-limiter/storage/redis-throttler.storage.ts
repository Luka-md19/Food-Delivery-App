import { Injectable, OnModuleInit } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { LoggerFactory } from '../../logger/logger.factory';
import { getRateLimitConfigForPath } from '../constants';

/**
 * Redis storage for throttler that properly tracks and decrements rate limits
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleInit {
  private readonly logger = LoggerFactory.getLogger('RedisThrottlerStorage');
  private readonly prefix = 'throttler:';
  private redisClient: Redis;

  constructor() {
    this.logger.log('Redis throttler storage initialized');
  }

  async onModuleInit() {
    // Get Redis configuration from environment variables
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || '';

    this.logger.log(`Connecting to Redis at ${host}:${port}`);

    try {
      this.redisClient = new Redis({
        host,
        port,
        password: password || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });

      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis connection error: ${err.message}`);
      });

      // Test connection
      await this.redisClient.ping();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      // Don't throw error, fallback to in-memory storage
    }
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
    const prefixedKey = this.prefix + key;
    const blockKey = `${prefixedKey}:blocked`;
    
    // Extract the actual path from the key
    let requestPath = '';
    const pathMatch = key.match(/path=([^:]+)/);
    if (pathMatch && pathMatch[1]) {
      requestPath = pathMatch[1];
    }
    
    // Override the ttl and limit based on the endpoint
    // This is necessary because the NestJS throttler doesn't correctly pass the
    // decorator-defined limits to the storage service
    const originalLimit = limit;
    const originalTtl = ttl;
    
    // Get the rate limit configuration for this path
    const rateLimitConfig = getRateLimitConfigForPath(requestPath);
    if (rateLimitConfig) {
      limit = rateLimitConfig.limit;
      ttl = rateLimitConfig.ttl * 1000; // Convert to milliseconds
    }
    
    try {
      if (!this.redisClient || this.redisClient.status !== 'ready') {
        this.logger.warn(`Redis client not ready, using fallback response`);
        return {
          totalHits: 1,
          timeToExpire: Math.ceil(ttl / 1000),
          isBlocked: false,
          timeToBlockExpire: 0,
        };
      }

      // Check if the key is blocked
      const isBlocked = await this.redisClient.exists(blockKey);
      
      if (isBlocked) {
        const timeToBlockExpire = await this.redisClient.pttl(blockKey);
        return {
          totalHits: limit + 1,
          timeToExpire: 0,
          isBlocked: true,
          timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
        };
      }
      
      // Get the current value of the key
      let hits = await this.redisClient.get(prefixedKey);
      let currentHits = 0;
      
      if (hits === null) {
        // Key doesn't exist, set it to 1 with the TTL
        await this.redisClient.set(prefixedKey, '1', 'PX', ttl);
        currentHits = 1;
      } else {
        // Key exists, increment it
        currentHits = parseInt(hits, 10) + 1;
        await this.redisClient.incr(prefixedKey);
        
        // If this is the first hit, make sure TTL is set
        if (currentHits === 1) {
          await this.redisClient.pexpire(prefixedKey, ttl);
        }
      }
      
      // Get the remaining time to expire
      const timeToExpire = await this.redisClient.pttl(prefixedKey);
      
      // If the hits exceed the limit, block the key
      if (currentHits > limit && blockDuration) {
        await this.redisClient.set(blockKey, '1', 'PX', blockDuration);
        if (requestPath.includes('/auth/login')) {
          this.logger.warn(`Rate limit exceeded for ${requestPath}: ${currentHits}/${limit}`);
        }
        return {
          totalHits: currentHits,
          timeToExpire: Math.ceil(timeToExpire / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }
      
      return {
        totalHits: currentHits,
        timeToExpire: Math.ceil(timeToExpire / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error) {
      this.logger.error(`Error incrementing throttle key: ${error.message}`);
      
      // In case of error, allow the request to proceed
      return {
        totalHits: 0,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}