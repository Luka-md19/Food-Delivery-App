import { FailedMessage } from '../../schemas';

/**
 * Interface for the failed message repository
 * This follows the repository pattern to abstract the data access layer
 */
export interface IFailedMessageRepository {
  /**
   * Save a failed message to the database
   * @param pattern The event pattern
   * @param payload The event payload
   * @param error Optional error message
   */
  saveFailedMessage(pattern: string, payload: any, error?: string): Promise<FailedMessage>;

  /**
   * Get all unprocessed failed messages
   * @param limit Maximum number of messages to retrieve
   */
  getUnprocessedMessages(limit?: number): Promise<FailedMessage[]>;

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
  updateRetryCount(id: string, error?: string): Promise<FailedMessage>;

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  cleanupProcessedMessages(olderThan: Date): Promise<number>;
} 