import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { LoggerFactory } from '@app/common';
import { AuthErrorHandlerService } from '../../common/auth-error-handler.service';
import { randomBytes } from 'crypto';
import { ITokenManager } from '../interfaces/token-manager.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenManagerService implements ITokenManager {
  private readonly logger = LoggerFactory.getLogger(TokenManagerService.name);
  private readonly MAX_TOKENS_PER_USER: number;
  private readonly DEFAULT_REFRESH_TOKEN_EXPIRATION: string;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService,
    private readonly configService: ConfigService
  ) {
    this.MAX_TOKENS_PER_USER = this.configService.get<number>('MAX_TOKENS_PER_USER', 5);
    this.DEFAULT_REFRESH_TOKEN_EXPIRATION = this.configService.get<string>('REFRESH_TOKEN_EXPIRATION', '7d');
    
    this.logger.log(`TokenManagerService initialized with MAX_TOKENS_PER_USER=${this.MAX_TOKENS_PER_USER}, DEFAULT_EXPIRATION=${this.DEFAULT_REFRESH_TOKEN_EXPIRATION}`);
  }

  /**
   * Create a refresh token for a user
   */
  async createRefreshToken(user: User, deviceInfo: string = '', token?: string): Promise<RefreshToken> {
    try {
      // Generate a random token if one is not provided
      const refreshToken = token || randomBytes(40).toString('hex');
      
      // Get expiration time from configuration
      const expiresAt = this.calculateExpirationDate(this.DEFAULT_REFRESH_TOKEN_EXPIRATION);
      
      // Check if user has too many active tokens already
      await this.enforceTokenLimit(user.id);
      
      const refreshTokenEntity = this.refreshTokenRepository.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
        isRevoked: false,
        deviceInfo
      });
      return this.refreshTokenRepository.save(refreshTokenEntity);
    } catch (error) {
      return this.errorHandler.handleUnexpectedError(error, 'createRefreshToken');
    }
  }

  /**
   * Find a token by its token string
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    this.logger.debug('Finding refresh token');
    try {
      return this.refreshTokenRepository.findOne({ 
        where: { token, isRevoked: false },
        relations: ['user']
      });
    } catch (error) {
      this.logger.error(`Error finding token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Delete a token by its ID
   */
  async deleteToken(tokenId: string): Promise<boolean> {
    this.logger.debug(`Deleting token with ID: ${tokenId}`);
    try {
      const result = await this.refreshTokenRepository.delete(tokenId);
      return result.affected > 0;
    } catch (error) {
      this.logger.error(`Error deleting token: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Invalidate a token by marking it as revoked
   */
  async invalidateToken(token: string): Promise<void> {
    this.logger.debug('Invalidating refresh token');
    try {
      await this.refreshTokenRepository.update(
        { token },
        { isRevoked: true }
      );
    } catch (error) {
      this.logger.error(`Error invalidating token: ${error.message}`, error.stack);
    }
  }

  /**
   * Rotate a refresh token by invalidating the old one and creating a new one
   */
  async rotateToken(oldToken: string): Promise<string> {
    this.logger.debug('Rotating refresh token');
    try {
      // Find the old token
      const tokenRecord = await this.findByToken(oldToken);
      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }
      
      // Mark the old token as revoked
      await this.invalidateToken(oldToken);
      
      // Generate a new token
      const newToken = randomBytes(40).toString('hex');
      
      // Create a new refresh token record
      const expiresAt = this.calculateExpirationDate(this.DEFAULT_REFRESH_TOKEN_EXPIRATION);
      
      const refreshToken = this.refreshTokenRepository.create({
        token: newToken,
        userId: tokenRecord.userId,
        expiresAt,
        isRevoked: false,
        deviceInfo: tokenRecord.deviceInfo
      });
      
      await this.refreshTokenRepository.save(refreshToken);
      
      return newToken;
    } catch (error) {
      this.logger.error(`Error rotating token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllTokens(userId: string): Promise<{ message: string; count: number }> {
    this.logger.log(`Revoking all tokens for user ${userId}`);
    
    try {
      const result = await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true }
      );
      
      if (result.affected === 0) {
        this.logger.warn(`No active tokens found for user ${userId}`);
        return { message: 'No active tokens found', count: 0 };
      }
      
      this.logger.log(`Successfully revoked ${result.affected} tokens for user ${userId}`);
      return { 
        message: 'All tokens revoked successfully', 
        count: result.affected 
      };
    } catch (error) {
      return this.errorHandler.handleUnexpectedError(error, 'revokeAllTokens');
    }
  }

  /**
   * Enforce token limit per user by revoking oldest tokens if necessary
   */
  async enforceTokenLimit(userId: string): Promise<void> {
    try {
      // Get count of active tokens for user
      const activeTokenCount = await this.refreshTokenRepository.count({
        where: {
          userId,
          isRevoked: false,
          expiresAt: MoreThan(new Date())
        }
      });
      
      // If under limit, no action needed
      if (activeTokenCount < this.MAX_TOKENS_PER_USER) {
        return;
      }
      
      // Get oldest tokens that exceed the limit
      const tokensToRevoke = await this.refreshTokenRepository.find({
        where: {
          userId,
          isRevoked: false,
          expiresAt: MoreThan(new Date())
        },
        order: { createdAt: 'ASC' },
        take: activeTokenCount - this.MAX_TOKENS_PER_USER + 1 // +1 for the new token we're about to create
      });
      
      if (tokensToRevoke.length === 0) {
        return;
      }
      
      // Revoke oldest tokens
      const tokenIds = tokensToRevoke.map(token => token.id);
      await this.refreshTokenRepository.update(
        { id: { $in: tokenIds } } as any, 
        { isRevoked: true }
      );
      
      this.logger.log(`Revoked ${tokenIds.length} oldest tokens for user ${userId} due to limit enforcement`);
    } catch (error) {
      this.logger.error(`Error enforcing token limit for user ${userId}: ${error.message}`, error.stack);
      // Continue with token creation even if limit enforcement fails
    }
  }

  /**
   * Calculates expiration date from string like '7d', '24h', etc.
   */
  private calculateExpirationDate(expiration: string): Date {
    const now = new Date();
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);
    
    switch (unit) {
      case 'd': // days
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'h': // hours
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'm': // minutes
        return new Date(now.getTime() + value * 60 * 1000);
      case 's': // seconds
        return new Date(now.getTime() + value * 1000);
      default:
        // Default to 7 days if format is invalid
        this.logger.warn(`Invalid expiration format: ${expiration}, using default 7 days`);
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
} 