import { User } from '../../users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenCleanupResponseDto } from '../dto/token-cleanup-response.dto';

/**
 * Interface defining token management operations
 * This serves as a facade that provides a unified API for all token-related operations,
 * delegating to specialized services internally.
 */
export interface ITokenService {
  /**
   * Create a refresh token for a user
   * Delegates to TokenManagerService
   */
  createRefreshToken(user: User, deviceInfo?: string, token?: string): Promise<RefreshToken>;
  
  /**
   * Validate a refresh token for a user
   * Delegates to SessionService
   */
  validateRefreshToken(user: User, token: string): Promise<void>;
  
  /**
   * Revoke (mark as invalid) a refresh token
   * Delegates to SessionService
   */
  removeRefreshToken(user: User, token: string): Promise<void>;
  
  /**
   * Get all active sessions for a user
   * Delegates to SessionService
   */
  getActiveSessions(userId: string): Promise<RefreshToken[]>;
  
  /**
   * Revoke a specific session by ID
   * Delegates to SessionService
   */
  revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }>;
  
  /**
   * Revoke all tokens for a user
   * Delegates to TokenManagerService
   */
  revokeAllTokens(userId: string): Promise<{ message: string; count: number }>;
  
  /**
   * Perform scheduled cleanup of expired tokens
   * Delegates to TokenCleanupService
   */
  cleanupExpiredTokens(): Promise<void>;
  
  /**
   * Manually trigger cleanup of expired tokens
   * Delegates to TokenCleanupService
   */
  manualCleanupExpiredTokens(): Promise<TokenCleanupResponseDto>;
  
  /**
   * Find a token record by refresh token string
   * Delegates to TokenManagerService
   */
  findByRefreshToken(refreshToken: string): Promise<RefreshToken | null>;
  
  /**
   * Delete a token by ID
   * Delegates to TokenManagerService
   */
  delete(tokenId: string): Promise<boolean>;
  
  /**
   * Invalidate a refresh token
   * Delegates to TokenManagerService
   */
  invalidateRefreshToken(refreshToken: string): Promise<void>;
  
  /**
   * Rotate a refresh token (replace with a new one)
   * Delegates to TokenManagerService
   */
  rotateRefreshToken(oldRefreshToken: string): Promise<string>;
  
  /**
   * Delete a token by session ID for a specific user
   * Delegates to SessionService
   */
  deleteById(sessionId: string, userId: string): Promise<{ message: string }>;
  
  /**
   * Invalidate all tokens for a user
   * Delegates to TokenManagerService
   */
  invalidateAllUserTokens(userId: string): Promise<void>;
  
  /**
   * Trigger token queue processing
   * Delegates to TokenConsumerService
   */
  triggerTokenProcessing(): Promise<void>;
  
  /**
   * Synchronize tokens with blacklist
   * Delegates to TokenConsumerService
   */
  synchronizeTokenBlacklist(): Promise<void>;
} 