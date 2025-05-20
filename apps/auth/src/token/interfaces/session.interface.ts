import { User } from '../../users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Jwtpayload } from '@app/common';

/**
 * Interface defining session management operations
 */
export interface ISessionManager {
  /**
   * Get all active sessions for a user
   */
  getActiveSessions(userId: string): Promise<RefreshToken[]>;
  
  /**
   * Validate a refresh token for a user
   */
  validateRefreshToken(user: User, token: string): Promise<void>;
  
  /**
   * Remove (revoke) a refresh token
   */
  removeRefreshToken(user: User, token: string): Promise<void>;
  
  /**
   * Revoke a specific session by ID
   */
  revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }>;
  
  /**
   * Delete a session by its ID
   */
  deleteSession(sessionId: string, userId: string, isAdmin?: boolean): Promise<{ message: string }>;
} 