/**
 * Interface for file storage service
 * This supports the Dependency Inversion principle by allowing
 * high-level modules to depend on abstractions rather than concrete implementations
 */
export interface IFileStorageService {
  /**
   * Store a failed message in the file system
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  storeFailedMessage(pattern: string, payload: any, errorMessage: string): Promise<string>;

  /**
   * Get all unprocessed failed messages from the file system
   * @param limit Maximum number of messages to retrieve
   */
  getUnprocessedMessages(limit?: number): Promise<any[]>;

  /**
   * Mark a failed message as processed
   * @param id The message ID
   */
  markAsProcessed(id: string): Promise<boolean>;

  /**
   * Update retry count and error for a failed message
   * @param id The message ID
   * @param errorMessage The error message
   */
  updateRetryCount(id: string, errorMessage?: string): Promise<any>;

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  cleanupProcessedMessages(olderThan: Date): Promise<number>;
} 