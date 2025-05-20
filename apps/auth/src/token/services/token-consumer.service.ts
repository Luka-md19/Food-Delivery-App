import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerFactory } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { TokenCleanupService } from './token-cleanup.service';
import { TokenManagerService } from './token-manager.service';
import { AuthErrorHandlerService } from '../../common/auth-error-handler.service';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { ITokenConsumerService } from '../interfaces/token-consumer.interface';

/**
 * Service responsible for consuming token-related jobs from a queue
 * and processing them accordingly.
 */
@Injectable()
export class TokenConsumerService implements ITokenConsumerService {
  private readonly logger = LoggerFactory.getLogger(TokenConsumerService.name);
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly BATCH_SIZE = 50;
  private readonly PROCESSING_INTERVAL_MS = 30000; // 30 seconds
  private readonly instanceId: string;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService,
    private readonly tokenCleanup: TokenCleanupService,
    private readonly tokenManager: TokenManagerService,
    private readonly tokenBlacklistService: TokenBlacklistService
  ) {
    // Generate a unique instance ID for distributed processing
    this.instanceId = Math.random().toString(36).substring(2, 15);
    
    this.logger.log('Token Consumer Service initialized');
  }

  /**
   * Initialize the service when the module starts
   */
  onModuleInit() {
    this.startProcessing();
  }

  /**
   * Start the processing interval
   */
  startProcessing() {
    if (this.processingInterval) {
      this.logger.warn('Processing already started');
      return;
    }

    this.logger.log(`Starting token job processing (interval: ${this.PROCESSING_INTERVAL_MS}ms)`);
    
    // Process immediately on startup
    this.processQueue().catch(err => {
      this.logger.error('Error during initial queue processing', err);
    });
    
    // Set up interval for continuous processing
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(err => {
        this.logger.error('Error during scheduled queue processing', err);
      });
    }, this.PROCESSING_INTERVAL_MS);
  }

  /**
   * Stop the processing interval
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log('Token job processing stopped');
    }
  }

  /**
   * Process the token job queue
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping this cycle');
      return;
    }

    this.isProcessing = true;

    try {
      // Here you would retrieve jobs from your queue
      // For demonstration, we'll run the token cleanup instead
      this.logger.log('Processing token jobs from queue');
      
      // Example: Run token cleanup as a scheduled task
      await this.performScheduledCleanup();
      
      // Example: Handle expired tokens that need notification
      // await this.handleExpiredTokenNotifications();
      
      this.logger.debug('Queue processing complete');
    } catch (error) {
      this.logger.error('Error processing token queue', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Run the scheduled token cleanup
   */
  async performScheduledCleanup(): Promise<void> {
    try {
      const result = await this.tokenCleanup.manualCleanupExpiredTokens();
      this.logger.log(`Token cleanup completed: ${result.revoked} revoked, ${result.deleted} deleted`);
    } catch (error) {
      this.logger.error('Error during scheduled token cleanup', error);
    }
  }

  /**
   * Handle any expired tokens that need notification
   * This is a placeholder for future implementation
   */
  async handleExpiredTokenNotifications(): Promise<void> {
    // Implementation would go here
    this.logger.debug('Expired token notifications processed');
  }

  /**
   * Manually trigger a queue processing cycle
   */
  async triggerProcessing(): Promise<void> {
    this.logger.log('Manually triggering token queue processing');
    return this.processQueue();
  }

  /**
   * Clean up resources when the module is destroyed
   */
  onModuleDestroy() {
    this.logger.log('Shutting down TokenConsumerService');
    this.stopProcessing();
  }

  /**
   * Synchronize the token repository with the blacklist
   * This ensures that any tokens in the blacklist are also marked as revoked in the database
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async synchronizeBlacklist(): Promise<void> {
    this.logger.log(`[${this.instanceId}] Starting blacklist synchronization`);
    
    try {
      // This would require implementing a method to get all blacklisted tokens
      // which may not be feasible with large numbers of tokens
      // Instead, focus on ensuring newly revoked tokens are added to the blacklist
      
      // Clean up the blacklist
      await this.tokenBlacklistService.pruneExpiredTokens();
      
      this.logger.log(`[${this.instanceId}] Blacklist synchronization completed`);
    } catch (error) {
      this.logger.error(`[${this.instanceId}] Error synchronizing blacklist: ${error.message}`, error.stack);
    }
  }

  /**
   * Clean up expired tokens and related blacklist entries
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupTokens(): Promise<void> {
    // Add jitter to prevent multiple instances from cleaning up at the same time
    const jitterMs = Math.floor(Math.random() * 60000); // 0-60 seconds
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    
    this.logger.log(`[${this.instanceId}] Starting token cleanup`);
    
    try {
      // Delegate to the token cleanup service
      await this.tokenCleanup.cleanupExpiredTokens();
      
      // Clean up the blacklist
      const prunedCount = await this.tokenBlacklistService.pruneExpiredTokens();
      
      this.logger.log(`[${this.instanceId}] Pruned ${prunedCount} expired blacklisted tokens`);
    } catch (error) {
      this.logger.error(`[${this.instanceId}] Error cleaning up tokens: ${error.message}`, error.stack);
    }
  }
} 