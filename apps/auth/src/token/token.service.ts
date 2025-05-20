import { Injectable, Inject } from '@nestjs/common';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { ITokenService } from './interfaces/token-service.interface';
import { LoggerFactory } from '@app/common';
import { TokenManagerService } from './services/token-manager.service';
import { SessionService } from './services/session.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { TokenCleanupResponseDto } from './dto/token-cleanup-response.dto';
import { ITokenConsumerService } from './interfaces/token-consumer.interface';
import { TOKEN_CONSUMER_SERVICE } from './token.constants';

/**
 * Facade service that delegates to specialized token-related services.
 * This provides a single entry point for token operations while maintaining
 * separation of concerns.
 * 
 * Service Responsibilities:
 * - TokenManagerService: Core token operations like creation, rotation, and invalidation
 * - SessionService: User session management and token validation
 * - TokenCleanupService: Handling expired token cleanup
 * - TokenConsumerService: Consuming token-related jobs from a queue
 */
@Injectable()
export class TokenService implements ITokenService {
  private readonly logger = LoggerFactory.getLogger(TokenService.name);

  constructor(
    private readonly tokenManagerService: TokenManagerService,
    private readonly sessionService: SessionService,
    private readonly tokenCleanupService: TokenCleanupService,
    @Inject(TOKEN_CONSUMER_SERVICE) private readonly tokenConsumerService: ITokenConsumerService,
  ) {}

  /**
   * Create a refresh token for a user
   * @delegate TokenManagerService
   */
  async createRefreshToken(user: User, deviceInfo: string = '', token?: string): Promise<RefreshToken> {
    return this.tokenManagerService.createRefreshToken(user, deviceInfo, token);
  }

  /**
   * Validate a refresh token for a user
   * @delegate SessionService
   */
  async validateRefreshToken(user: User, token: string): Promise<void> {
    return this.sessionService.validateRefreshToken(user, token);
  }

  /**
   * Remove (revoke) a refresh token
   * @delegate SessionService
   */
  async removeRefreshToken(user: User, token: string): Promise<void> {
    return this.sessionService.removeRefreshToken(user, token);
  }

  /**
   * Get all active sessions for a user
   * @delegate SessionService
   */
  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.sessionService.getActiveSessions(userId);
  }

  /**
   * Revoke a specific session by ID
   * @delegate SessionService
   */
  async revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }> {
    return this.sessionService.revokeSession(userId, sessionId, isAdmin);
  }

  /**
   * Revoke all tokens for a user
   * @delegate TokenManagerService
   */
  async revokeAllTokens(userId: string): Promise<{ message: string; count: number }> {
    return this.tokenManagerService.revokeAllTokens(userId);
  }

  /**
   * Perform scheduled cleanup of expired tokens
   * @delegate TokenCleanupService
   */
  async cleanupExpiredTokens(): Promise<void> {
    return this.tokenCleanupService.cleanupExpiredTokens();
  }

  /**
   * Manually trigger cleanup of expired tokens
   * @delegate TokenCleanupService
   */
  async manualCleanupExpiredTokens(): Promise<TokenCleanupResponseDto> {
    // First trigger the consumer to process any pending tokens
    await this.tokenConsumerService.triggerProcessing();
    // Then run the regular cleanup
    return this.tokenCleanupService.manualCleanupExpiredTokens();
  }
  
  /**
   * Find a token record by refresh token string
   * @delegate TokenManagerService
   */
  async findByRefreshToken(refreshToken: string): Promise<RefreshToken | null> {
    return this.tokenManagerService.findByToken(refreshToken);
  }
  
  /**
   * Delete a token by ID
   * @delegate TokenManagerService
   */
  async delete(tokenId: string): Promise<boolean> {
    return this.tokenManagerService.deleteToken(tokenId);
  }
  
  /**
   * Invalidate a refresh token
   * @delegate TokenManagerService
   */
  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    return this.tokenManagerService.invalidateToken(refreshToken);
  }
  
  /**
   * Rotate a refresh token (replace with a new one)
   * @delegate TokenManagerService
   */
  async rotateRefreshToken(oldRefreshToken: string): Promise<string> {
    return this.tokenManagerService.rotateToken(oldRefreshToken);
  }
  
  /**
   * Delete a token by session ID for a specific user
   * @delegate SessionService
   */
  async deleteById(sessionId: string, userId: string): Promise<{ message: string }> {
    return this.sessionService.deleteSession(sessionId, userId);
  }
  
  /**
   * Invalidate all tokens for a user
   * @delegate TokenManagerService via revokeAllTokens
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const result = await this.revokeAllTokens(userId);
    this.logger.log(`Invalidated ${result.count} tokens for user ${userId}`);
  }

  /**
   * Trigger token queue processing
   * @delegate TokenConsumerService
   */
  async triggerTokenProcessing(): Promise<void> {
    return this.tokenConsumerService.triggerProcessing();
  }

  /**
   * Synchronize tokens with blacklist
   * @delegate TokenConsumerService
   */
  async synchronizeTokenBlacklist(): Promise<void> {
    return this.tokenConsumerService.synchronizeBlacklist();
  }
}