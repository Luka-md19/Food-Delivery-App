import { User } from '../../users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export interface ITokenService {
  createRefreshToken(user: User, token: string): Promise<RefreshToken>;
  validateRefreshToken(user: User, token: string): Promise<void>;
  removeRefreshToken(user: User, token: string): Promise<void>;
  getActiveSessions(userId: string): Promise<RefreshToken[]>;
  revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }>;
  revokeAllTokens(userId: string): Promise<{ message: string; count: number }>;
} 