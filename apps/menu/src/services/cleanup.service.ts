import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppConfigService, CacheService } from '@app/common';
import { FailedMessage } from '../schemas/common';
import { Menu } from '../schemas/menu';

/**
 * Service responsible for cleaning up old menu data
 * This follows the Single Responsibility Principle by focusing solely on data cleanup
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly instanceId: string;

  constructor(
    @InjectModel(FailedMessage.name) private failedMessageModel: Model<FailedMessage>,
    @InjectModel(Menu.name) private menuModel: Model<Menu>,
    private readonly cacheService: CacheService,
    private readonly configService: AppConfigService
  ) {
    // Generate a unique ID for this service instance
    this.instanceId = `menu-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean up old failed messages
   * Runs every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupFailedMessages(): Promise<void> {
    try {
      // Add jitter to prevent multiple instances from cleaning up at the same time
      const jitterMs = Math.floor(Math.random() * 60000); // 0-60 seconds
      await new Promise(resolve => setTimeout(resolve, jitterMs));
      
      this.logger.log(`[${this.instanceId}] Starting failed messages cleanup`);
      
      const daysToKeep = this.configService.get('FAILED_MESSAGES_RETENTION_DAYS', '30');
      const retentionDays = parseInt(daysToKeep, 10);
      
      // Calculate date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
      
      // Delete old failed messages
      const result = await this.failedMessageModel.deleteMany({
        createdAt: { $lt: thresholdDate }
      });
      
      this.logger.log(`[${this.instanceId}] Removed ${result.deletedCount} failed messages older than ${retentionDays} days`);
    } catch (error) {
      this.logger.error(`[${this.instanceId}] Error cleaning up failed messages: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Clean up Redis cache keys
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupRedisCache(): Promise<void> {
    try {
      // Add jitter to prevent multiple instances from cleaning up at the same time
      const jitterMs = Math.floor(Math.random() * 30000); // 0-30 seconds
      await new Promise(resolve => setTimeout(resolve, jitterMs));
      
      this.logger.log(`[${this.instanceId}] Starting Redis cache cleanup`);
      
      // Find stale cache patterns - these might need to be adjusted based on your caching strategy
      const stalePatterns = [
        'menu:list:*',       // List caches older than threshold
        'category:list:*',   // Category lists
        'menu-item:list:*'   // Menu item lists
      ];
      
      let totalRemoved = 0;
      
      // Process each pattern
      for (const pattern of stalePatterns) {
        const keys = await this.cacheService.keys(pattern);
        
        for (const key of keys) {
          // Check TTL - if less than 10% of original TTL remains, refresh or remove
          const ttl = await this.cacheService.ttl(key);
          
          // TTL of -1 means no expiry, -2 means key doesn't exist
          if (ttl === -1) {
            // Key exists but has no expiry, force an expiry
            await this.cacheService.delete(key);
            totalRemoved++;
          }
        }
      }
      
      this.logger.log(`[${this.instanceId}] Pruned ${totalRemoved} stale cache entries`);
    } catch (error) {
      this.logger.error(`[${this.instanceId}] Error cleaning up Redis cache: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Clean up inactive menus
   * Runs weekly on Sunday at 2am
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupInactiveMenus(): Promise<void> {
    try {
      // Add jitter to prevent multiple instances from cleaning up at the same time
      const jitterMs = Math.floor(Math.random() * 120000); // 0-120 seconds
      await new Promise(resolve => setTimeout(resolve, jitterMs));
      
      this.logger.log(`[${this.instanceId}] Starting inactive menus cleanup`);
      
      // Get configuration for inactivity threshold
      const inactivityMonths = this.configService.get('MENU_INACTIVITY_MONTHS', '6');
      const inactivityThreshold = parseInt(inactivityMonths, 10);
      
      // Calculate date threshold
      const thresholdDate = new Date();
      thresholdDate.setMonth(thresholdDate.getMonth() - inactivityThreshold);
      
      // Find inactive menus that haven't been updated in the threshold period
      // Don't actually delete them, just mark them as inactive for archiving
      const result = await this.menuModel.updateMany(
        { 
          updatedAt: { $lt: thresholdDate },
          active: true // Only target currently active menus
        },
        {
          $set: { 
            active: false,
            archivedAt: new Date(),
            archivedReason: `Automatically archived due to ${inactivityThreshold} months of inactivity`
          }
        }
      );
      
      this.logger.log(`[${this.instanceId}] Archived ${result.modifiedCount} inactive menus older than ${inactivityThreshold} months`);
      
      // Clear cache for these items
      if (result.modifiedCount > 0) {
        // Clear menu cache patterns
        await this.cacheService.delete('menu:list:*');
        this.logger.log(`[${this.instanceId}] Cleared cache for archived menus`);
      }
    } catch (error) {
      this.logger.error(`[${this.instanceId}] Error cleaning up inactive menus: ${error.message}`, error.stack);
    }
  }
} 