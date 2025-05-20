import { User } from '../../users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * Interface defining core token management operations
 */
export interface ITokenManager {
  /**
   * Create a refresh token for a user
   */
  createRefreshToken(user: User, deviceInfo?: string, token?: string): Promise<RefreshToken>;
  
  /**
   * Find a token by its token string
   */
  findByToken(token: string): Promise<RefreshToken | null>;
  
  /**
   * Delete a token by its ID
   */
  deleteToken(tokenId: string): Promise<boolean>;
  
  /**
   * Invalidate a token by marking it as revoked
   */
  invalidateToken(token: string): Promise<void>;
  
  /**
   * Rotate a refresh token by invalidating the old one and creating a new one
   */
  rotateToken(oldToken: string): Promise<string>;
  
  /**
   * Revoke all tokens for a user
   */
  revokeAllTokens(userId: string): Promise<{ message: string; count: number }>;
  
  /**
   * Enforce token limit per user by revoking oldest tokens if necessary
   */
  enforceTokenLimit?(userId: string): Promise<void>;
} 