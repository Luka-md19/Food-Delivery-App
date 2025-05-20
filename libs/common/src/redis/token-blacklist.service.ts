// libs/common/src/redis/token-blacklist.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';

/**
 * Service for managing JWT token blacklist in Redis
 * Implements a distributed blacklist for JWT tokens that works across instances
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly prefix = 'blacklist:';
  private readonly scanCount = 100; // Batch size for Redis SCAN operations

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  /**
   * Add a token to the blacklist
   * @param token JWT token to blacklist
   * @param expirySeconds Seconds until token expiry (based on JWT exp claim)
   */
  async addToBlacklist(token: string, expirySeconds: number): Promise<void>;
  async addToBlacklist(token: string, expiryDate: Date): Promise<void>;
  async addToBlacklist(token: string, expiry: number | Date): Promise<void> {
    try {
      const key = this.getKeyWithPrefix(token);
      const now = Math.floor(Date.now() / 1000);
      
      // Calculate seconds until expiry
      let expirySeconds: number;
      
      if (expiry instanceof Date) {
        // Convert Date to seconds from now
        const expiryTime = Math.floor(expiry.getTime() / 1000);
        expirySeconds = Math.max(0, expiryTime - now);
      } else {
        // Use provided number directly
        expirySeconds = expiry;
      }
      
      // Store token in Redis with TTL to auto-expire
      await this.redisClient.set(key, now.toString(), 'EX', expirySeconds);
      
      this.logger.debug(`Added token to blacklist with ${expirySeconds}s TTL`);
    } catch (error) {
      this.logger.error(`Failed to add token to blacklist: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token to check
   * @returns true if blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = this.getKeyWithPrefix(token);
      const exists = await this.redisClient.exists(key);
      
      const isBlacklisted = exists === 1;
      this.logger.debug(`Token blacklist check: ${isBlacklisted ? 'blacklisted' : 'not blacklisted'}`);
      
      return isBlacklisted;
    } catch (error) {
      this.logger.error(`Failed to check token blacklist: ${error.message}`);
      // In case of error, assume not blacklisted to prevent lockout
      return false;
    }
  }

  /**
   * Remove a token from the blacklist
   * @param token JWT token to remove
   */
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      const key = this.getKeyWithPrefix(token);
      await this.redisClient.del(key);
      
      this.logger.debug('Removed token from blacklist');
    } catch (error) {
      this.logger.error(`Failed to remove token from blacklist: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prune expired tokens from the blacklist
   * Note: Redis automatically removes keys with TTL, but this
   * method helps clean up any tokens that might not have been
   * properly set with an expiry
   * 
   * @returns Number of pruned tokens
   */
  async pruneExpiredTokens(): Promise<number> {
    let cursor = '0';
    let count = 0;
    
    try {
      this.logger.log('Starting pruning of expired tokens in blacklist');
      
      do {
        // Scan for blacklisted tokens in batches
        const [nextCursor, keys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          `${this.prefix}*`,
          'COUNT',
          this.scanCount
        );
        
        cursor = nextCursor;
        
        if (keys.length === 0) {
          continue;
        }
        
        // Process each key
        for (const key of keys) {
          // Check if the key has an expiry
          const ttl = await this.redisClient.ttl(key);
          
          // If TTL is -1, it means the key has no expiry
          if (ttl === -1) {
            // Check when the token was blacklisted (stored as timestamp)
            const timestamp = await this.redisClient.get(key);
            
            if (timestamp) {
              const blacklistedAt = parseInt(timestamp, 10);
              const now = Math.floor(Date.now() / 1000);
              
              // If the token was blacklisted more than 24 hours ago, remove it
              if (now - blacklistedAt > 86400) {
                await this.redisClient.del(key);
                count++;
              }
            } else {
              // If no timestamp is found, delete the key
              await this.redisClient.del(key);
              count++;
            }
          }
        }
      } while (cursor !== '0');
      
      this.logger.log(`Pruned ${count} expired tokens from blacklist`);
      return count;
    } catch (error) {
      this.logger.error(`Error pruning blacklist: ${error.message}`, error.stack);
      return count;
    }
  }

  /**
   * Get Redis key with prefix to avoid collisions
   * @param token JWT token
   * @returns Prefixed key
   */
  private getKeyWithPrefix(token: string): string {
    // Use a hash of the token as the key
    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    return `${this.prefix}${hash}`;
  }
}
