import { Injectable, OnModuleInit, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { LoggerFactory } from '../../logger/logger.factory';
import { getRateLimitConfigForPath } from '../constants/helper-functions';

/**
 * Interface to match the ThrottlerStorage record structure
 */
export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Simple circuit breaker implementation for Redis operations
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly logger = LoggerFactory.getLogger('CircuitBreaker');

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 30000, // 30 seconds
    private readonly halfOpenRequests: number = 3
  ) {
    this.logger.log(`Circuit breaker initialized with threshold: ${failureThreshold}, reset timeout: ${resetTimeout}ms`);
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn The function to execute
   * @returns The result of the function, or null if the circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.logger.log('Circuit breaker moving to HALF_OPEN state');
        this.state = 'HALF_OPEN';
      } else {
        // Circuit is still open
        return null;
      }
    }

    // If circuit is half-open, only allow a few test requests
    if (this.state === 'HALF_OPEN' && this.failures >= this.halfOpenRequests) {
      return null;
    }

    try {
      // Execute the function
      const result = await fn();
      
      // If successful and in half-open state, reset the circuit
      if (this.state === 'HALF_OPEN') {
        this.logger.log('Circuit breaker resetting to CLOSED state after successful request');
        this.reset();
      }
      
      return result;
    } catch (error) {
      // Record the failure
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // If failures exceed threshold and circuit is not already open, open it
      if (this.failures >= this.failureThreshold && (this.state === 'CLOSED' || this.state === 'HALF_OPEN')) {
        this.logger.warn(`Circuit breaker tripped after ${this.failures} failures, opening circuit`);
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Get the current state of the circuit breaker
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }
}

/**
 * Redis-backed storage options
 */
export interface RedisThrottlerStorageOptions {
  keyPrefix?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  [key: string]: any;
}

/**
 * Token for Redis throttler options
 */
export const REDIS_THROTTLER_OPTIONS = 'REDIS_THROTTLER_OPTIONS';

/**
 * Memory-based storage for use as a fallback when Redis is unavailable
 */
class MemoryThrottlerStorage {
  private storage: Map<string, { hits: number; expires: number }> = new Map();
  private readonly logger = LoggerFactory.getLogger('MemoryThrottlerFallback');

  constructor() {
    this.logger.log('Memory throttler fallback initialized');
    // Clean up expired keys every minute
    setInterval(() => this.cleanupExpiredKeys(), 60000);
  }

  private cleanupExpiredKeys(): void {
    const now = Date.now();
    for (const [key, value] of this.storage.entries()) {
      if (value.expires < now) {
        this.storage.delete(key);
      }
    }
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const record = this.storage.get(key);
    
    if (!record || record.expires < now) {
      // Create new record
      this.storage.set(key, {
        hits: 1,
        expires: now + ttl
      });
      
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    } else {
      // Update existing record
      record.hits++;
      
      return {
        totalHits: record.hits,
        timeToExpire: record.expires - now,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }
  }

  async getRateLimits(key: string): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const record = this.storage.get(key);
    
    if (!record || record.expires < now) {
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }
    
    return {
      totalHits: record.hits,
      timeToExpire: record.expires - now,
      isBlocked: false,
      timeToBlockExpire: 0
    };
  }
}

/**
 * Redis-backed storage for throttling
 * This provides distributed rate limiting that works across instances
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private readonly logger = LoggerFactory.getLogger('RedisThrottlerStorage');
  private redisClient: Redis;
  private microserviceName: string | undefined;
  private circuitBreaker: CircuitBreaker;
  private isConnected = false;
  private options: RedisThrottlerStorageOptions;
  private memoryFallback: MemoryThrottlerStorage;

  constructor(@Optional() @Inject(REDIS_THROTTLER_OPTIONS) options?: RedisThrottlerStorageOptions) {
    this.logger.log('RedisThrottlerStorage initialized');
    this.circuitBreaker = new CircuitBreaker();
    this.options = options || {};
    this.memoryFallback = new MemoryThrottlerStorage();
    
    // Default Redis configuration (can be made configurable)
    this.redisClient = new Redis({
      host: this.options.host || process.env.REDIS_HOST || 'localhost',
      port: this.options.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      password: this.options.password || process.env.REDIS_PASSWORD,
      keyPrefix: this.options.keyPrefix || 'throttler:',
      db: this.options.db || 0,
      retryStrategy: (times: number) => {
        this.logger.warn(`Redis connection attempt ${times}`);
        return Math.min(times * 200, 3000); // Exponential back-off
      },
    });
    
    // Log connection events
    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Redis server');
      this.isConnected = true;
      // Reset circuit breaker on successful connection
      this.circuitBreaker.reset();
    });
    
    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
      this.isConnected = false;
    });
  }
  
  /**
   * Set the microservice context for this storage
   * @param serviceName Name of the microservice
   */
  public setMicroserviceContext(serviceName: string): void {
    this.microserviceName = serviceName;
    this.logger.log(`RedisThrottlerStorage configured for microservice: ${serviceName}`);
  }
  
  /**
   * Generate a key with appropriate prefixes
   * @param key Base key
   * @returns Prefixed key
   */
  private getPrefixedKey(key: string): string {
    return this.microserviceName ? `ms:${this.microserviceName}:${key}` : key;
  }

  async onModuleInit(): Promise<void> {
    try {
      // Test Redis connection on init
      this.logger.log('Testing Redis connection...');
      const pong = await this.redisClient.ping();
      this.logger.log(`Redis connection test: ${pong}`);
      this.isConnected = pong === 'PONG';
      
      if (!this.isConnected) {
        this.logger.warn('Redis connection test failed, rate limiting may not work correctly');
      } else {
        this.logger.log('Redis connection established successfully for rate limiting');
      }
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
      this.isConnected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Closing Redis connection');
      await this.redisClient.quit();
    } catch (error) {
      this.logger.error(`Error closing Redis connection: ${error.message}`, error.stack);
    }
  }

  /**
   * Check if Redis is available
   */
  private async isRedisAvailable(): Promise<boolean> {
    // If we already know we're not connected, return false immediately
    if (!this.redisClient || !this.isConnected) {
      this.logger.warn('Redis client not initialized or not connected');
      return false;
    }

    try {
      // Try to execute a simple command with circuit breaker protection
      const result = await this.circuitBreaker.execute(() => this.redisClient.ping());
      const available = result === 'PONG';
      
      if (!available) {
        this.logger.warn('Redis ping returned unexpected result:', result);
      }
      
      return available;
    } catch (error) {
      this.logger.error(`Redis availability check failed: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Implementation of ThrottlerStorage.increment method
   * This method is called by the throttler module to record a request
   */
  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    // Check Redis availability before proceeding
    const redisAvailable = await this.isRedisAvailable();
    if (!redisAvailable) {
      this.logger.warn(`Redis unavailable, using memory fallback for key: ${key}`);
      // Return default values that won't block requests but still show in headers
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }

    const prefixedKey = this.getPrefixedKey(key);
    try {
      // Get current value or set to 0 if not exists
      let exists = await this.redisClient.exists(prefixedKey);
      if (exists === 0) {
        // Key doesn't exist yet, initialize it with TTL
        await this.redisClient.set(prefixedKey, '1', 'EX', ttl / 1000); // Convert ms to seconds
        return {
          totalHits: 1,
          timeToExpire: ttl,
          isBlocked: false,
          timeToBlockExpire: 0
        };
      } else {
        // Key exists, increment it
        const value = await this.redisClient.incr(prefixedKey);
        // Check the TTL for the key
        const ttlRemaining = await this.redisClient.ttl(prefixedKey);
        
        if (ttlRemaining < 0) {
          // If TTL is negative, set it
          await this.redisClient.expire(prefixedKey, ttl / 1000); // Convert ms to seconds
        }
        
        // Check if we should block this key
        const isBlocked = value > limit;
        let timeToBlockExpire = 0;
        
        if (isBlocked && blockDuration > 0) {
          const blockKey = `${prefixedKey}:blocked`;
          // Set block key with TTL
          await this.redisClient.set(blockKey, '1', 'EX', blockDuration / 1000); // Convert ms to seconds
          timeToBlockExpire = blockDuration;
          
          this.logger.warn(`Rate limit exceeded for ${key}: ${value}/${limit}`);
        }
        
        return {
          totalHits: value,
          timeToExpire: ttlRemaining * 1000, // Convert seconds to ms
          isBlocked,
          timeToBlockExpire
        };
      }
    } catch (error) {
      this.logger.error(`Error incrementing rate limit for ${key}: ${error.message}`, error.stack);
      // Return default values that won't block requests
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }
  }

  /**
   * Extended increment method with more options for internal use
   */
  async incrementWithOptions(
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
    const prefixedKey = this.getPrefixedKey(key);
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
    
    // Check if Redis is available using circuit breaker
    const isRedisAvailable = await this.isRedisAvailable();
    
    if (!isRedisAvailable) {
      // If Redis is not available or circuit is open, use a fallback strategy
      this.logger.warn(
        `Redis unavailable (Circuit: ${this.circuitBreaker.getState()}), using fallback response for ${requestPath}`
      );
      return {
        totalHits: 1, // Conservative approach - always count a hit but allow the request
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    try {
      // Execute Redis commands with circuit breaker protection
      return await this.circuitBreaker.execute(async () => {
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
      }) || {
        // Default response if circuit breaker returns null
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
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

  /**
   * Track rate limit violations for analytics
   */
  private async trackRateLimitViolation(key: string, path: string, method: string): Promise<void> {
    try {
      const violationKey = `violations:${key.split(':').slice(-1)[0]}`;
      const now = Date.now();
      
      // Store violation in a sorted set with timestamp as score
      await this.redisClient.zadd(violationKey, now, `${now}:${path}:${method}`);
      
      // Keep violations for 7 days
      await this.redisClient.expire(violationKey, 60 * 60 * 24 * 7);
    } catch (error) {
      this.logger.error(`Error tracking rate limit violation: ${error.message}`, error.stack);
    }
  }

  /**
   * Get the current rate limit information for a key
   */
  async getRateLimits(key: string): Promise<ThrottlerStorageRecord> {
    // Check Redis availability before proceeding
    const redisAvailable = await this.isRedisAvailable();
    if (!redisAvailable) {
      this.logger.warn(`Redis unavailable, using memory fallback for key: ${key}`);
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }

    const prefixedKey = this.getPrefixedKey(key);
    try {
      // Get the current count and TTL
      const count = await this.redisClient.get(prefixedKey);
      const remainingTtl = await this.redisClient.ttl(prefixedKey);
      
      // Check if the key is blocked
      const blockKey = `${prefixedKey}:blocked`;
      const isBlocked = await this.redisClient.exists(blockKey) === 1;
      let timeToBlockExpire = 0;
      
      if (isBlocked) {
        timeToBlockExpire = await this.redisClient.ttl(blockKey) * 1000; // Convert to milliseconds
      }
      
      if (count === null || remainingTtl < 0) {
        return {
          totalHits: 0,
          timeToExpire: 0,
          isBlocked,
          timeToBlockExpire
        };
      }
      
      return {
        totalHits: parseInt(count, 10),
        timeToExpire: remainingTtl * 1000, // Convert seconds to milliseconds
        isBlocked,
        timeToBlockExpire
      };
    } catch (error) {
      this.logger.error(`Error getting rate limits for ${key}: ${error.message}`, error.stack);
      // Return default values
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }
  }
  
  /**
   * Reset specific rate limit (for admin use)
   */
  async resetRateLimit(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      this.logger.log(`Reset rate limit for key: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error resetting rate limit: ${error.message}`, error.stack);
      return false;
    }
  }
  
  /**
   * Sync rate limits across microservices 
   * This allows sharing rate limit data across different services
   */
  async syncAcrossMicroservices(sourceService: string, targetService: string, userIdOrIp: string): Promise<boolean> {
    if (!this.microserviceName) {
      this.logger.warn('Cannot sync rate limits without microservice context');
      return false;
    }
    
    try {
      // Implement sync logic (example)
      return true;
    } catch (error) {
      this.logger.error(`Error syncing rate limits: ${error.message}`, error.stack);
      return false;
    }
  }
}