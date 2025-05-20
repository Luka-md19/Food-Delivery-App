import { Injectable } from '@nestjs/common';
import { MongoDBService } from '@app/common/database/mongodb';
import { BaseRepository } from './base.repository';
import { FailedMessageDocument, IFailedMessageRepository } from './failed-message.repository.interface';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FailedMessage } from '../../schemas/common';

/**
 * Repository for failed messages operations
 */
@Injectable()
export class FailedMessageRepository extends BaseRepository<FailedMessageDocument> implements IFailedMessageRepository {
  constructor(
    protected readonly mongoDBService: MongoDBService,
    @InjectModel(FailedMessage.name) private readonly failedMessageModel: Model<FailedMessage>
  ) {
    super(mongoDBService, 'failed_messages', FailedMessageRepository.name);
  }

  /**
   * Save a failed message to the repository
   * @param pattern Message pattern
   * @param payload Message payload
   * @param error Error message
   * @returns The saved message
   */
  async saveFailedMessage(pattern: string, payload: any, error: string): Promise<FailedMessageDocument> {
    try {
      this.logger.log(`Saving failed message with pattern: ${pattern}`);
      
      const failedMessage: Partial<FailedMessageDocument> = {
        pattern,
        payload,
        retryCount: 0,
        processed: false,
        lastError: {
          message: error,
          timestamp: new Date().toISOString()
        }
      };
      
      return this.create(failedMessage as FailedMessageDocument);
    } catch (error) {
      this.logger.error(`Error saving failed message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all unprocessed messages
   * @param limit Maximum number of messages to retrieve
   */
  async getUnprocessedMessages(limit = 100): Promise<FailedMessageDocument[]> {
    try {
      const filter = { processed: false };
      return this.findAll(filter, 1, limit);
    } catch (error) {
      this.logger.error(`Error getting unprocessed messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all messages with optional filtering
   * @param filter Filter to apply
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @param sort Sorting options
   */
  async findAll(filter: any = {}, page = 1, limit = 10, sort: any = { createdAt: -1 }): Promise<FailedMessageDocument[]> {
    try {
      const collection = await this.getCollection();
      const pagination = this.validator.validatePagination(page, limit);
      const skip = (pagination.page - 1) * pagination.limit;
      
      // Process the filter
      const processedFilter: any = { ...filter };
      
      const results = await collection.find(processedFilter)
        .sort(sort)
        .skip(skip)
        .limit(pagination.limit)
        .toArray();
      
      return results as FailedMessageDocument[];
    } catch (error) {
      this.logger.error(`Error finding failed messages: ${error.message}`);
      return [];
    }
  }

  /**
   * Mark a failed message as processed
   * @param id The message ID
   */
  async markAsProcessed(id: string): Promise<boolean> {
    try {
      const result = await this.update(id, { processed: true });
      return result !== null;
    } catch (error) {
      this.logger.error(`Error marking message as processed: ${error.message}`);
      return false;
    }
  }

  /**
   * Update retry count and error for a failed message
   * @param id The message ID
   * @param error The error message
   */
  async updateRetryCount(id: string, error?: string): Promise<FailedMessageDocument> {
    try {
      const failedMessage = await this.findById(id);
      if (!failedMessage) {
        throw new Error(`Failed message with ID ${id} not found`);
      }
      
      const updates: Partial<FailedMessageDocument> = {
        retryCount: (failedMessage.retryCount || 0) + 1
      };
      
      if (error) {
        updates.lastError = { message: error, timestamp: new Date().toISOString() };
      }
      
      const updatedMessage = await this.update(id, updates);
      if (!updatedMessage) {
        throw new Error(`Failed to update retry count for message with ID ${id}`);
      }
      
      return updatedMessage;
    } catch (error) {
      this.logger.error(`Error updating retry count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  async cleanupProcessedMessages(olderThan: Date): Promise<number> {
    try {
      const result = await this.failedMessageModel.deleteMany({
        processed: true,
        updatedAt: { $lt: olderThan }
      });
      
      this.logger.log(`Deleted ${result.deletedCount} processed messages`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Error cleaning up processed messages: ${error.message}`);
      return 0;
    }
  }
}