import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { MongoDBService } from '@app/common/database/mongodb';
import { IFailedMessageRepository } from './failed-message.repository.interface';
import { FailedMessage } from '../schemas/failed-message.schema';
import { ObjectId } from 'mongodb';

@Injectable()
export class FailedMessageRepository extends BaseRepository implements IFailedMessageRepository {
  constructor(
    protected readonly mongoDBService: MongoDBService,
    @InjectModel(FailedMessage.name) private readonly failedMessageModel: Model<FailedMessage>
  ) {
    super(mongoDBService, 'failed_messages', 'FailedMessageRepository');
  }

  /**
   * Save a failed message to the database
   * @param pattern The event pattern
   * @param payload The event payload
   * @param error Optional error message
   */
  async saveFailedMessage(pattern: string, payload: any, error?: string): Promise<FailedMessage> {
    try {
      this.logger.log(`Saving failed message for pattern: ${pattern}`);
      
      const failedMessage = new this.failedMessageModel({
        pattern,
        payload,
        retryCount: 0,
        processed: false,
        lastError: error,
      });
      
      return await failedMessage.save();
    } catch (error) {
      this.logger.error(`Error saving failed message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all unprocessed failed messages
   * @param limit Maximum number of messages to retrieve
   */
  async getUnprocessedMessages(limit = 100): Promise<FailedMessage[]> {
    try {
      this.logger.log(`Getting unprocessed messages, limit: ${limit}`);
      
      return this.failedMessageModel
        .find({ processed: false })
        .sort({ createdAt: 1 }) // Process oldest messages first
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error getting unprocessed messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a failed message as processed
   * @param id The message ID
   */
  async markAsProcessed(id: string): Promise<boolean> {
    try {
      this.logger.log(`Marking message as processed: ${id}`);
      
      const result = await this.failedMessageModel.updateOne(
        { _id: new ObjectId(id) },
        { $set: { processed: true, updatedAt: new Date() } }
      );
      
      return result.modifiedCount === 1;
    } catch (error) {
      this.logger.error(`Error marking message as processed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Update retry count and error for a failed message
   * @param id The message ID
   * @param error The error message
   */
  async updateRetryCount(id: string, error?: string): Promise<FailedMessage> {
    try {
      this.logger.log(`Updating retry count for message: ${id}`);
      
      const failedMessage = await this.failedMessageModel.findById(id);
      if (!failedMessage) {
        throw new Error(`Failed message with ID ${id} not found`);
      }
      
      failedMessage.retryCount += 1;
      if (error) {
        failedMessage.lastError = error;
      }
      failedMessage.updatedAt = new Date();
      
      return await failedMessage.save();
    } catch (error) {
      this.logger.error(`Error updating retry count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  async cleanupProcessedMessages(olderThan: Date): Promise<number> {
    try {
      this.logger.log(`Cleaning up processed messages older than: ${olderThan.toISOString()}`);
      
      const result = await this.failedMessageModel.deleteMany({
        processed: true,
        updatedAt: { $lt: olderThan }
      });
      
      this.logger.log(`Deleted ${result.deletedCount} processed messages`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Error cleaning up processed messages: ${error.message}`, error.stack);
      return 0;
    }
  }
} 