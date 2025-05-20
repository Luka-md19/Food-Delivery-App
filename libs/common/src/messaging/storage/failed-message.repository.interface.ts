import { BaseDocument } from '../../database/mongodb/mongo.types';
import { Sort } from 'mongodb';

/**
 * Document interface for FailedMessage in MongoDB
 */
export interface FailedMessageDocument extends BaseDocument {
  pattern: string;
  payload: any;
  retryCount: number;
  processed: boolean;
  lastError?: {
    message: string;
    timestamp?: string;
  };
}

/**
 * Interface for the failed message repository
 * This follows the repository pattern to abstract the data access layer
 */
export interface IFailedMessageRepository {
  /**
   * Save a failed message to the repository
   * @param pattern The event pattern
   * @param payload The event payload
   * @param error Error message
   */
  saveFailedMessage(pattern: string, payload: any, error: string): Promise<FailedMessageDocument>;

  /**
   * Find all messages with optional filtering
   * @param filter Filter to apply
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @param sort Sorting options
   */
  findAll(filter?: any, page?: number, limit?: number, sort?: Sort): Promise<FailedMessageDocument[]>;

  /**
   * Get all unprocessed messages
   * @param limit Maximum number of messages to retrieve
   */
  getUnprocessedMessages(limit?: number): Promise<FailedMessageDocument[]>;

  /**
   * Mark a failed message as processed
   * @param id The message ID
   */
  markAsProcessed(id: string): Promise<boolean>;

  /**
   * Update retry count and error for a failed message
   * @param id The message ID
   * @param error The error message
   */
  updateRetryCount(id: string, error?: string): Promise<FailedMessageDocument>;

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  cleanupProcessedMessages(olderThan: Date): Promise<number>;
} 