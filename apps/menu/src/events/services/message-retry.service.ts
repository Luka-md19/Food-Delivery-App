import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { IFailedMessageRepository } from '../../repositories/failed-message.repository.interface';
import { FailedMessage, FailedMessageDocument } from '../../schemas/common/failed-message.schema';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class MessageRetryService {
  private readonly logger = new Logger(MessageRetryService.name);
  private readonly maxRetries = 5;
  private readonly batchSize = 50;
  private isProcessing = false;

  constructor(
    @Inject('IFailedMessageRepository') private readonly failedMessageRepository: IFailedMessageRepository,
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
    private readonly fileStorageService: FileStorageService
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
  private async retryDatabaseMessage(message: FailedMessage & { _id?: string }): Promise<void> {
    try {
      const messageId = (message as any)._id?.toString() || '';
      this.logger.log(`Retrying database message ${messageId} for pattern ${message.pattern}, attempt ${message.retryCount + 1}`);
      
      // If we've exceeded the maximum number of retries, mark as processed (failed)
      if (message.retryCount >= this.maxRetries) {
        this.logger.warn(`Database message ${messageId} has exceeded maximum retry attempts (${this.maxRetries}), marking as processed`);
        await this.failedMessageRepository.markAsProcessed(messageId);
        return;
      }
      
      // Attempt to publish the message
      await this.client.emit(message.pattern, message.payload).toPromise();
      
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
      
      // Attempt to publish the message
      await this.client.emit(message.pattern, message.payload).toPromise();
      
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
} 