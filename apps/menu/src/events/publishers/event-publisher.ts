import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IFailedMessageRepository } from '../../repositories/common/failed-message.repository.interface';
import { FileStorageService } from '../services/file-storage.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EventPublisher implements OnModuleInit {
  private readonly logger = new Logger(EventPublisher.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private circuitOpen = false;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds
  private isRabbitMQReady = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private readonly connectionCheckDelay = 5000; // 5 seconds

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
    @Inject('IFailedMessageRepository') private readonly failedMessageRepository: IFailedMessageRepository,
    private readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Initialize the publisher and check RabbitMQ connection
   */
  async onModuleInit() {
    this.logger.log('Initializing EventPublisher...');
    await this.checkRabbitMQConnection();
    
    // Set up periodic connection check
    this.connectionCheckInterval = setInterval(() => {
      this.checkRabbitMQConnection().catch(error => {
        this.logger.error(`Error checking RabbitMQ connection: ${error.message}`, error.stack);
      });
    }, this.connectionCheckDelay);
  }

  /**
   * Check if RabbitMQ connection is ready
   */
  async checkRabbitMQConnection(): Promise<boolean> {
    try {
      this.logger.log('Checking RabbitMQ connection...');
      
      // Try to connect to RabbitMQ
      await this.client.connect();
      
      if (!this.isRabbitMQReady) {
        this.logger.log('RabbitMQ connection established successfully');
        this.isRabbitMQReady = true;
        
        // If circuit was open due to connection issues, reset it
        if (this.circuitOpen) {
          this.logger.log('Resetting circuit breaker due to successful connection');
          this.circuitOpen = false;
          this.failureCount = 0;
        }
      }
      
      return true;
    } catch (error) {
      if (this.isRabbitMQReady) {
        this.logger.error(`RabbitMQ connection lost: ${error.message}`, error.stack);
        this.isRabbitMQReady = false;
        
        // Open circuit if connection is lost
        if (!this.circuitOpen) {
          this.openCircuit();
        }
      } else {
        this.logger.warn(`RabbitMQ connection not available: ${error.message}`);
      }
      
      return false;
    }
  }

  /**
   * Publish an event to the message broker
   * @param pattern The event pattern
   * @param payload The event payload
   */
  async publish(pattern: string, payload: any): Promise<void> {
    // If RabbitMQ is not ready, store the message for later retry
    if (!this.isRabbitMQReady) {
      this.logger.warn(`RabbitMQ not ready. Message to ${pattern} will be stored for later retry.`);
      await this.storeFailedMessage(pattern, payload, 'RabbitMQ not ready');
      return;
    }
    
    // If circuit is open, store the message for later retry
    if (this.circuitOpen) {
      this.logger.warn(`Circuit is open. Message to ${pattern} will be stored for later retry.`);
      await this.storeFailedMessage(pattern, payload, 'Circuit is open');
      return;
    }

    try {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          this.logger.log(`Publishing message to ${pattern}: ${JSON.stringify(payload)}`);
          await firstValueFrom(this.client.emit(pattern, payload));
          
          // Reset failure count on successful publish
          this.failureCount = 0;
          return;
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          
          this.logger.warn(`Retry attempt ${attempt}/${this.maxRetries} for pattern ${pattern}`);
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    } catch (error) {
      this.failureCount++;
      this.logger.error(`Failed to publish message to ${pattern}: ${error.message}`, error.stack);
      
      // Check if the connection is still available
      await this.checkRabbitMQConnection();
      
      // Open circuit if failure threshold is reached
      if (this.failureCount >= this.failureThreshold) {
        this.openCircuit();
      }
      
      // Store failed message in the database for later retry
      await this.storeFailedMessage(pattern, payload, error.message);
    }
  }

  private openCircuit(): void {
    this.circuitOpen = true;
    this.logger.warn('Circuit breaker opened due to multiple failures');
    
    // Reset circuit after timeout
    setTimeout(() => {
      this.circuitOpen = false;
      this.failureCount = 0;
      this.logger.log('Circuit breaker reset');
    }, this.resetTimeout);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store a failed message in the database for later retry
   * If database storage fails, fall back to file storage
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  private async storeFailedMessage(pattern: string, payload: any, errorMessage: string): Promise<void> {
    try {
      this.logger.log(`Storing failed message for pattern ${pattern} in the database`);
      await this.failedMessageRepository.saveFailedMessage(pattern, payload, errorMessage);
      this.logger.log(`Failed message for pattern ${pattern} stored successfully in database`);
    } catch (dbError) {
      this.logger.error(`Error storing failed message in database: ${dbError.message}`, dbError.stack);
      
      // Fall back to file storage if database storage fails
      try {
        this.logger.log(`Falling back to file storage for pattern ${pattern}`);
        const id = await this.fileStorageService.storeFailedMessage(pattern, payload, errorMessage);
        this.logger.log(`Failed message for pattern ${pattern} stored successfully in file with ID: ${id}`);
      } catch (fileError) {
        this.logger.error(`Error storing failed message in file: ${fileError.message}`, fileError.stack);
        // As a last resort, log the message
        this.logFailedMessage(pattern, payload, errorMessage);
      }
    }
  }

  /**
   * Log a failed message as a last resort when both database and file storage fail
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  private logFailedMessage(pattern: string, payload: any, errorMessage: string): void {
    this.logger.error(`CRITICAL: Failed to store message - Pattern: ${pattern}, Error: ${errorMessage}, Payload: ${JSON.stringify(payload)}`);
    // This is a last resort when both database and file storage fail
    // In a production system, you might want to send an alert to a monitoring system
  }
} 