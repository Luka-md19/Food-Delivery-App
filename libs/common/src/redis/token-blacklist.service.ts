// libs/common/src/redis/token-blacklist.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import * as Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis.Redis) {}

  /**
   * Blacklists a token for a given duration (in seconds).
   */
  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    try {
      await this.redisClient.set(token, 'blacklisted', 'EX', expiresInSeconds);
      this.logger.debug(`Token blacklisted: ${token}`);
    } catch (error) {
      this.logger.error('Failed to blacklist token', error);
      throw error;
    }
  }

  /**
   * Checks if a token is blacklisted.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redisClient.get(token);
      return result === 'blacklisted';
    } catch (error) {
      this.logger.error('Failed to check token blacklist', error);
      return false;
    }
  }
}
