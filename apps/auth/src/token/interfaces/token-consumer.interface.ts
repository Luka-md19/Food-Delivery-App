import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * Interface for the token consumer service
 * Defines methods for processing token-related jobs from a queue
 */
export interface ITokenConsumerService extends OnModuleInit, OnModuleDestroy {
  /**
   * Start processing token jobs
   */
  startProcessing(): void;
  
  /**
   * Stop processing token jobs
   */
  stopProcessing(): void;
  
  /**
   * Process the token job queue
   */
  processQueue(): Promise<void>;
  
  /**
   * Run the scheduled token cleanup
   */
  performScheduledCleanup(): Promise<void>;
  
  /**
   * Handle any expired tokens that need notification
   */
  handleExpiredTokenNotifications(): Promise<void>;
  
  /**
   * Manually trigger a queue processing cycle
   */
  triggerProcessing(): Promise<void>;
  
  /**
   * Synchronize the token repository with the blacklist
   */
  synchronizeBlacklist(): Promise<void>;
  
  /**
   * Clean up expired tokens and related blacklist entries
   */
  cleanupTokens(): Promise<void>;
} 