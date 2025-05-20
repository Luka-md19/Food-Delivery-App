/**
 * Interface for the message retry service
 * This supports the Dependency Inversion principle by allowing
 * high-level modules to depend on abstractions rather than concrete implementations
 */
export interface IMessageRetryService {
  /**
   * Retry all failed messages
   */
  retryFailedMessages(): Promise<void>;

  /**
   * Retry a specific failed message by ID
   * @param id The message ID
   */
  retrySpecificMessage(id: string): Promise<boolean>;

  /**
   * Clean up old processed messages
   */
  cleanupOldMessages(): Promise<void>;
} 