import { TokenCleanupResponseDto } from '../dto/token-cleanup-response.dto';

/**
 * Interface defining operations for token cleanup.
 * Responsible for managing the lifecycle of expired tokens
 * and providing cleanup functionality.
 */
export interface ITokenCleanupService {
  /**
   * Performs scheduled cleanup of expired tokens
   * Called by cron job or scheduler
   */
  cleanupExpiredTokens(): Promise<void>;
  
  /**
   * Manually triggers cleanup of expired tokens
   * Returns detailed information about the cleanup operation
   */
  manualCleanupExpiredTokens(): Promise<TokenCleanupResponseDto>;
} 