// libs/common/src/redis/cache.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';

/**
 * Generic Redis-based cache service implementing common caching operations
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix = 'cache:';
  
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  /**
   * Set a value in cache with expiration
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttlSeconds Time-to-live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      const stringValue = JSON.stringify(value);
      await this.redisClient.set(prefixedKey, stringValue, 'EX', ttlSeconds);
      this.logger.debug(`Cached value for key: ${key} with TTL: ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`Failed to cache value for key: ${key}`, error.message);
      throw error;
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      const value = await this.redisClient.get(prefixedKey);
      
      if (!value) {
        this.logger.debug(`Cache miss for key: ${key}`);
        return null;
      }
      
      this.logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cached value for key: ${key}`, error.message);
      return null;
    }
  }

  /**
   * Get a value from cache, if not found, execute factory function and cache result
   * @param key Cache key
   * @param factory Function that returns value to cache if not found
   * @param ttlSeconds Time-to-live in seconds
   * @returns Cached value or result of factory function
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlSeconds: number
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      await this.redisClient.del(prefixedKey);
      this.logger.debug(`Deleted cache key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error.message);
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns true if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      const exists = await this.redisClient.exists(prefixedKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check if key exists: ${key}`, error.message);
      return false;
    }
  }

  /**
   * Get time-to-live for a key in seconds
   * @param key Cache key
   * @returns TTL in seconds or -1 if key does not exist, -2 if key exists but has no expiry
   */
  async ttl(key: string): Promise<number> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      return await this.redisClient.ttl(prefixedKey);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key: ${key}`, error.message);
      return -1;
    }
  }

  /**
   * Clear all cache keys with this service's prefix
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Cleared ${keys.length} cache keys`);
      }
    } catch (error) {
      this.logger.error('Failed to clear cache', error.message);
      throw error;
    }
  }

  /**
   * Find keys matching a pattern
   * @param pattern Key pattern to match (without prefix)
   * @returns Array of matching keys (without prefix)
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const prefixedPattern = this.getKeyWithPrefix(pattern);
      const keys = await this.redisClient.keys(prefixedPattern);
      
      // Remove the prefix from the keys before returning
      return keys.map(key => key.substring(this.prefix.length));
    } catch (error) {
      this.logger.error(`Failed to find keys matching pattern: ${pattern}`, error.message);
      return [];
    }
  }

  /**
   * Add prefix to cache key to avoid collisions
   */
  private getKeyWithPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }
} 