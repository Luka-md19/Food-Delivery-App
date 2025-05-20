import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { IFailedMessageRepository, FailedMessageDocument } from '../../../repositories/common/failed-message.repository.interface';
import { FailedMessage } from '../../../schemas/common';
import { IFileStorageService } from '../file-storage/file-storage.interface';
import { LoggerFactory, IEventPublisher } from '@app/common';
import { IMessageRetryService } from './message-retry.interface';
import { MongoDBService } from '@app/common/database/mongodb';

@Injectable()
export class MessageRetryService implements IMessageRetryService {
  private readonly logger = LoggerFactory.getLogger(MessageRetryService.name);
  private readonly maxRetries = 5;
  private readonly batchSize = 50;
  private isProcessing = false;

  constructor(
    @Inject('IFailedMessageRepository') private readonly failedMessageRepository: IFailedMessageRepository,
    private readonly eventPublisher: IEventPublisher,
    @Inject('IFileStorageService') private readonly fileStorageService: IFileStorageService,
    private readonly mongoDBService: MongoDBService
  ) {}

  /**
   * Scheduled job to retry failed messages
   * Runs every 5 minutes by default
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedMessages() {
    if (this.isProcessing) {
      this.logger.log('Already processing failed messages, skipping this run');
      return;
    }

    try {
      this.isProcessing = true;
      this.logger.log('Starting to process failed messages');
      
      // First, try to process messages from the database
      await this.retryDatabaseMessages();
      
      // Then, process messages from the file storage
      await this.retryFileMessages();
      
      this.logger.log('Finished processing failed messages');
    } catch (error) {
      this.logger.error(`Error processing failed messages: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry messages from the database
   */
  private async retryDatabaseMessages(): Promise<void> {
    try {
      const failedMessages = await this.failedMessageRepository.getUnprocessedMessages(this.batchSize);
      
      if (failedMessages.length === 0) {
        this.logger.log('No failed messages in database to process');
        return;
      }
      
      this.logger.log(`Found ${failedMessages.length} failed messages in database to retry`);
      
      for (const message of failedMessages) {
        await this.retryDatabaseMessage(message);
      }
    } catch (error) {
      this.logger.error(`Error processing database messages: ${error.message}`, error.stack);
    }
  }

  /**
   * Retry messages from the file storage
   */
  private async retryFileMessages(): Promise<void> {
    try {
      const failedMessages = await this.fileStorageService.getUnprocessedMessages(this.batchSize);
      
      if (failedMessages.length === 0) {
        this.logger.log('No failed messages in file storage to process');
        return;
      }
      
      this.logger.log(`Found ${failedMessages.length} failed messages in file storage to retry`);
      
      for (const message of failedMessages) {
        await this.retryFileMessage(message);
      }
    } catch (error) {
      this.logger.error(`Error processing file messages: ${error.message}`, error.stack);
    }
  }

  /**
   * Retry a single failed message from the database
   * @param message The failed message to retry
   */
  private async retryDatabaseMessage(message: FailedMessageDocument): Promise<void> {
    try {
      const messageId = (message as any)._id?.toString() || '';
      this.logger.log(`Retrying database message ${messageId} for pattern ${message.pattern}, attempt ${message.retryCount + 1}`);
      
      // If we've exceeded the maximum number of retries, mark as processed (failed)
      if (message.retryCount >= this.maxRetries) {
        this.logger.warn(`Database message ${messageId} has exceeded maximum retry attempts (${this.maxRetries}), marking as processed`);
        await this.failedMessageRepository.markAsProcessed(messageId);
        return;
      }
      
      // Attempt to publish the message using the EventPublisher
      await this.eventPublisher.publish(message.pattern, message.payload);
      
      // If successful, mark as processed
      this.logger.log(`Successfully republished database message ${messageId}`);
      await this.failedMessageRepository.markAsProcessed(messageId);
    } catch (error) {
      const messageId = (message as any)._id?.toString() || '';
      this.logger.error(`Failed to retry database message ${messageId}: ${error.message}`, error.stack);
      
      // Update retry count and error
      await this.failedMessageRepository.updateRetryCount(messageId, error.message);
    }
  }

  /**
   * Retry a single failed message from the file storage
   * @param message The failed message to retry
   */
  private async retryFileMessage(message: any): Promise<void> {
    try {
      this.logger.log(`Retrying file message ${message.id} for pattern ${message.pattern}, attempt ${message.retryCount + 1}`);
      
      // If we've exceeded the maximum number of retries, mark as processed (failed)
      if (message.retryCount >= this.maxRetries) {
        this.logger.warn(`File message ${message.id} has exceeded maximum retry attempts (${this.maxRetries}), marking as processed`);
        await this.fileStorageService.markAsProcessed(message.id);
        return;
      }
      
      // Attempt to publish the message using the EventPublisher
      await this.eventPublisher.publish(message.pattern, message.payload);
      
      // If successful, mark as processed
      this.logger.log(`Successfully republished file message ${message.id}`);
      await this.fileStorageService.markAsProcessed(message.id);
      
      // Try to save the message to the database as well
      try {
        await this.failedMessageRepository.saveFailedMessage(
          message.pattern, 
          message.payload, 
          `Recovered from file storage: ${message.errorMessage}`
        );
        this.logger.log(`File message ${message.id} also saved to database for tracking`);
      } catch (dbError) {
        this.logger.warn(`Could not save file message ${message.id} to database: ${dbError.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to retry file message ${message.id}: ${error.message}`, error.stack);
      
      // Update retry count and error
      await this.fileStorageService.updateRetryCount(message.id, error.message);
    }
  }

  /**
   * Cleanup old processed messages
   * Runs once a day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldMessages() {
    try {
      this.logger.log('Starting cleanup of old processed messages');
      
      // Delete processed messages older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Cleanup database messages
      try {
        const dbDeletedCount = await this.failedMessageRepository.cleanupProcessedMessages(thirtyDaysAgo);
        this.logger.log(`Deleted ${dbDeletedCount} old processed messages from database`);
      } catch (dbError) {
        this.logger.error(`Error cleaning up database messages: ${dbError.message}`, dbError.stack);
      }
      
      // Cleanup file storage messages
      try {
        const fileDeletedCount = await this.fileStorageService.cleanupProcessedMessages(thirtyDaysAgo);
        this.logger.log(`Deleted ${fileDeletedCount} old processed messages from file storage`);
      } catch (fileError) {
        this.logger.error(`Error cleaning up file storage messages: ${fileError.message}`, fileError.stack);
      }
    } catch (error) {
      this.logger.error(`Error in cleanup job: ${error.message}`, error.stack);
    }
  }

  /**
   * Retry a specific failed message by ID
   * This can be used for manual retry via API endpoints
   * @param id The message ID
   */
  async retrySpecificMessage(id: string): Promise<boolean> {
    try {
      this.logger.log(`Manually retrying message with ID: ${id}`);
      
      // Fetch the message from the database
      const messages = await this.failedMessageRepository.getUnprocessedMessages(1000);
      const message = messages.find(msg => (msg as any)._id?.toString() === id);
      
      if (!message) {
        this.logger.warn(`Message with ID ${id} not found or already processed`);
        return false;
      }
      
      // Attempt to republish the message using the EventPublisher
      try {
        await this.eventPublisher.publish(message.pattern, message.payload);
        this.logger.log(`Successfully republished message ${id}`);
        
        // Mark as processed if successful
        await this.failedMessageRepository.markAsProcessed(id);
        return true;
      } catch (error) {
        this.logger.error(`Failed to republish message ${id}: ${error.message}`, error.stack);
        
        // Update retry count and error
        await this.failedMessageRepository.updateRetryCount(id, error.message);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error retrying specific message: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Migrate data from the old collection (failedMessages) to the new one (failed_messages)
   * This is needed because of a collection naming inconsistency
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async migrateCollections() {
    try {
      this.logger.log('Checking for data migration from old failed messages collection');
      
      // Get database access directly from the MongoDBService
      const db = await this.mongoDBService.getDb();
      if (!db) {
        this.logger.warn('Could not access database for migration check');
        return;
      }
      
      // Check if old collection exists
      const collections = await db.listCollections().toArray();
      const oldCollectionExists = collections.some(c => c.name === 'failedMessages');
      
      if (!oldCollectionExists) {
        this.logger.debug('Old failedMessages collection does not exist, no migration needed');
        return;
      }
      
      // Get counts from both collections
      const oldCollection = db.collection('failedMessages');
      const newCollection = db.collection('failed_messages');
      
      const oldCount = await oldCollection.countDocuments();
      if (oldCount === 0) {
        this.logger.log('Old collection is empty, no migration needed');
        return;
      }
      
      this.logger.log(`Found ${oldCount} documents in old failedMessages collection to migrate`);
      
      // Migrate in batches
      const batchSize = 100;
      let migratedCount = 0;
      
      let batch = await oldCollection.find().limit(batchSize).toArray();
      while (batch.length > 0) {
        // Insert batch into new collection
        if (batch.length > 0) {
          await newCollection.insertMany(batch, { ordered: false });
          migratedCount += batch.length;
          
          // Get IDs to delete from old collection
          const ids = batch.map(doc => doc._id);
          await oldCollection.deleteMany({ _id: { $in: ids } });
        }
        
        this.logger.log(`Migrated ${migratedCount} documents so far`);
        
        // Get next batch
        batch = await oldCollection.find().limit(batchSize).toArray();
      }
      
      // Check if old collection is now empty
      const remainingCount = await oldCollection.countDocuments();
      if (remainingCount === 0) {
        this.logger.log('Successfully migrated all documents, dropping old collection');
        await oldCollection.drop();
      } else {
        this.logger.warn(`Migration completed but ${remainingCount} documents still remain in old collection`);
      }
      
      this.logger.log('Data migration completed successfully');
    } catch (error) {
      this.logger.error(`Error during failed messages collection migration: ${error.message}`, error.stack);
    }
  }
} 