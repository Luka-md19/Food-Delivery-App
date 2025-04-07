import { Injectable, Inject, Logger } from '@nestjs/common';
import { IFailedMessageRepository } from '../repositories/common/failed-message.repository.interface';
import { IMessageRetryService } from '../events/services/message/message-retry.interface';
import { FailedMessageDto } from '../dto/common/failed-message.dto';
import { LoggerFactory } from '@app/common/logger';

@Injectable()
export class AdminService {
  private readonly logger = LoggerFactory.getLogger(AdminService.name);
  
  constructor(
    @Inject('IFailedMessageRepository') private readonly failedMessageRepository: IFailedMessageRepository,
    @Inject('IMessageRetryService') private readonly messageRetryService: IMessageRetryService,
  ) {}

  /**
   * Get failed messages with pagination and filtering options
   * @param limit Maximum number of messages to retrieve
   * @param includeProcessed Whether to include already processed messages
   * @returns Object containing count and array of failed messages
   */
  async getFailedMessages(
    limit: number,
    includeProcessed: boolean
  ): Promise<{ count: number, messages: FailedMessageDto[] }> {
    this.logger.debug(`Getting failed messages with limit: ${limit}, includeProcessed: ${includeProcessed}`);
    
    let messages: any[];
    
    if (includeProcessed) {
      // Get all messages including processed ones
      const filter = {};
      messages = await this.failedMessageRepository.findAll(filter, 1, limit, { createdAt: -1 });
      this.logger.debug(`Retrieved ${messages.length} messages including processed ones`);
    } else {
      // Get only unprocessed messages (default behavior)
      messages = await this.failedMessageRepository.getUnprocessedMessages(limit);
      this.logger.debug(`Retrieved ${messages.length} unprocessed messages`);
    }
    
    return {
      count: messages.length,
      messages: messages.map(message => FailedMessageDto.fromEntity(message))
    };
  }

  /**
   * Retry a specific failed message by ID
   * @param id Message ID to retry
   * @returns Object indicating success status and message
   */
  async retryMessage(id: string): Promise<{ success: boolean, message: string }> {
    this.logger.debug(`Attempting to retry message with ID: ${id}`);
    
    const result = await this.messageRetryService.retrySpecificMessage(id);
    
    if (result) {
      this.logger.debug(`Successfully processed message: ${id}`);
    } else {
      this.logger.error(`Failed to process message: ${id}`);
    }
    
    return {
      success: result,
      message: result 
        ? 'Message successfully processed' 
        : 'Failed to process message'
    };
  }

  /**
   * Retry all failed messages in the system
   * @returns Object indicating the process has started
   */
  async retryAllMessages(): Promise<{ success: boolean, message: string }> {
    this.logger.debug('Initiating retry of all failed messages');
    
    // Start the retry process asynchronously
    await this.messageRetryService.retryFailedMessages();
    
    return {
      success: true,
      message: 'Retry process initiated'
    };
  }
} 