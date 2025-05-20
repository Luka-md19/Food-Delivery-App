import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LoggerFactory } from '../../logger';
import { IFailedMessageRepository } from '../storage/failed-message.repository.interface';
import { IFileStorageService } from '../storage/file-storage.interface';
import { 
  CircuitStatus, 
  EventPublisherOptions, 
  IEventPublisher, 
  PublisherMetrics 
} from './event-publisher.interface';

interface CircuitState {
  status: CircuitStatus;
  failureCount: number;
  lastFailureTime: number | null;
  consecutiveSuccesses: number;
}

/**
 * Event publisher with circuit breaker and retry functionality
 * This implementation follows the Single Responsibility Principle by focusing solely on reliable event publishing
 */
@Injectable()
export class EventPublisher implements IEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = LoggerFactory.getLogger(EventPublisher.name);
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRequests: number;
  private readonly successThreshold: number;
  private readonly connectionCheckDelay: number;
  private isRabbitMQReady = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private readonly circuitState: CircuitState = {
    status: CircuitStatus.CLOSED,
    failureCount: 0,
    lastFailureTime: null,
    consecutiveSuccesses: 0
  };
  
  // Metrics for monitoring
  private metrics: PublisherMetrics = {
    totalPublished: 0,
    successfulPublishes: 0,
    failedPublishes: 0,
    storedInDatabase: 0,
    storedInFile: 0,
    circuitBreaks: 0,
  };

  private lastMetricsLog = Date.now();

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
    @Optional() @Inject('IFailedMessageRepository') private readonly failedMessageRepository?: IFailedMessageRepository,
    @Optional() @Inject('IFileStorageService') private readonly fileStorageService?: IFileStorageService,
    @Optional() options?: EventPublisherOptions
  ) {
    // Default values
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryDelay = options?.retryDelay ?? 1000; // 1 second
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeout = options?.resetTimeout ?? 30000; // 30 seconds
    this.halfOpenRequests = options?.halfOpenRequests ?? 3;
    this.successThreshold = options?.successThreshold ?? 5;
    this.connectionCheckDelay = options?.connectionCheckDelay ?? 5000; // 5 seconds
  }

  /**
   * Initialize the publisher and check RabbitMQ connection
   * This method is automatically called when the module is initialized
   */
  async onModuleInit() {
    await this.initialize();
  }
  
  /**
   * Initialize the publisher
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing EventPublisher...');
    await this.checkRabbitMQConnection();
    
    // Set up periodic connection check
    this.connectionCheckInterval = setInterval(() => {
      this.checkRabbitMQConnection().catch(error => {
        this.logger.error(`Error checking RabbitMQ connection: ${error.message}`, error.stack);
      });
      
      // Log metrics every minute
      this.logPeriodicMetrics();
    }, this.connectionCheckDelay);
  }
  
  /**
   * Clean up resources when module is destroyed
   */
  onModuleDestroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // Log final metrics
    this.logMetrics();
  }

  /**
   * Get current metrics
   */
  getMetrics(): PublisherMetrics {
    return { ...this.metrics };
  }

  /**
   * Log periodic metrics about message publishing
   */
  private logPeriodicMetrics() {
    const now = Date.now();
    // Log metrics every minute
    if (now - this.lastMetricsLog >= 60000) {
      this.logMetrics();
      this.lastMetricsLog = now;
    }
  }
  
  /**
   * Log current metrics about message publishing
   */
  private logMetrics() {
    this.logger.log(
      `Publisher metrics - Total: ${this.metrics.totalPublished}, ` +
      `Success: ${this.metrics.successfulPublishes}, ` +
      `Failed: ${this.metrics.failedPublishes}, ` +
      `DB Storage: ${this.metrics.storedInDatabase}, ` +
      `File Storage: ${this.metrics.storedInFile}, ` +
      `Circuit Breaks: ${this.metrics.circuitBreaks}`
    );
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
        
        // If circuit was open due to connection issues, consider testing
        if (this.circuitState.status !== CircuitStatus.CLOSED) {
          this.transitionToHalfOpen('Connection restored');
        }
      }
      
      return true;
    } catch (error) {
      if (this.isRabbitMQReady) {
        this.logger.error(`RabbitMQ connection lost: ${error.message}`, error.stack);
        this.isRabbitMQReady = false;
        
        // Open circuit if connection is lost
        if (this.circuitState.status === CircuitStatus.CLOSED) {
          this.openCircuit('Connection lost');
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
    this.metrics.totalPublished++;
    
    // If RabbitMQ is not ready, store the message for later retry
    if (!this.isRabbitMQReady) {
      this.logger.warn(`RabbitMQ not ready. Message to ${pattern} will be stored for later retry.`);
      await this.storeFailedMessage(pattern, payload, 'RabbitMQ not ready');
      return;
    }
    
    // Handle publishing based on circuit state
    switch (this.circuitState.status) {
      case CircuitStatus.OPEN:
        this.logger.warn(`Circuit is open. Message to ${pattern} will be stored for later retry.`);
        await this.storeFailedMessage(pattern, payload, 'Circuit is open');
        return;
        
      case CircuitStatus.HALF_OPEN:
        // Only allow a limited number of test requests through
        if (this.shouldAllowRequestInHalfOpen()) {
          this.logger.log(`Allowing test request in half-open state for ${pattern}`);
          break; // Proceed with publish attempt
        } else {
          this.logger.warn(`Circuit is half-open, not allowing additional requests for ${pattern}`);
          await this.storeFailedMessage(pattern, payload, 'Circuit is half-open, limiting requests');
          return;
        }
        
      case CircuitStatus.CLOSED:
      default:
        // Proceed with publish attempt
        break;
    }

    try {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          this.logger.log(`Publishing message to ${pattern} (attempt ${attempt}/${this.maxRetries})`);
          await firstValueFrom(this.client.emit(pattern, payload));
          
          // Update metrics and circuit state on success
          this.metrics.successfulPublishes++;
          this.recordSuccess();
          return;
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          
          this.logger.warn(`Retry attempt ${attempt}/${this.maxRetries} for pattern ${pattern}: ${error.message}`);
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    } catch (error) {
      this.metrics.failedPublishes++;
      this.recordFailure(error);
      this.logger.error(`Failed to publish message to ${pattern}: ${error.message}`, error.stack);
      
      // Check if the connection is still available
      await this.checkRabbitMQConnection();
      
      // Store failed message for later retry
      await this.storeFailedMessage(pattern, payload, error.message);
    }
  }
  
  /**
   * Record a successful publish
   */
  private recordSuccess(): void {
    this.circuitState.consecutiveSuccesses++;
    this.circuitState.failureCount = 0;
    
    // If we're in HALF_OPEN and have enough consecutive successes, close the circuit
    if (this.circuitState.status === CircuitStatus.HALF_OPEN && 
        this.circuitState.consecutiveSuccesses >= this.successThreshold) {
      this.closeCircuit();
    }
  }
  
  /**
   * Record a failed publish
   */
  private recordFailure(error: Error): void {
    this.circuitState.failureCount++;
    this.circuitState.lastFailureTime = Date.now();
    this.circuitState.consecutiveSuccesses = 0;
    
    // If in HALF_OPEN, immediately go back to OPEN
    if (this.circuitState.status === CircuitStatus.HALF_OPEN) {
      this.openCircuit('Failed in half-open state');
      return;
    }
    
    // Open circuit if failure threshold is reached in CLOSED state
    if (this.circuitState.status === CircuitStatus.CLOSED && 
        this.circuitState.failureCount >= this.failureThreshold) {
      this.openCircuit('Failure threshold reached');
    }
  }
  
  /**
   * Transition the circuit from CLOSED to OPEN
   */
  private openCircuit(reason: string): void {
    if (this.circuitState.status !== CircuitStatus.OPEN) {
      this.circuitState.status = CircuitStatus.OPEN;
      this.circuitState.lastFailureTime = Date.now();
      this.metrics.circuitBreaks++;
      this.logger.warn(`Circuit OPENED: ${reason}`);
      
      // Schedule check to move to HALF_OPEN after timeout
      setTimeout(() => {
        if (this.circuitState.status === CircuitStatus.OPEN) {
          this.transitionToHalfOpen('Reset timeout elapsed');
        }
      }, this.resetTimeout);
    }
  }
  
  /**
   * Transition the circuit from OPEN to HALF_OPEN
   */
  private transitionToHalfOpen(reason: string): void {
    if (this.circuitState.status === CircuitStatus.OPEN) {
      this.circuitState.status = CircuitStatus.HALF_OPEN;
      this.circuitState.consecutiveSuccesses = 0;
      this.logger.log(`Circuit changed from OPEN to HALF_OPEN: ${reason}`);
    }
  }
  
  /**
   * Transition the circuit from HALF_OPEN to CLOSED
   */
  private closeCircuit(): void {
    if (this.circuitState.status !== CircuitStatus.CLOSED) {
      this.circuitState.status = CircuitStatus.CLOSED;
      this.circuitState.failureCount = 0;
      this.circuitState.lastFailureTime = null;
      this.logger.log('Circuit CLOSED after successful test requests');
    }
  }
  
  /**
   * Determine if a request should be allowed through in half-open state
   */
  private shouldAllowRequestInHalfOpen(): boolean {
    // Only allow a limited number of requests based on consecutive successes
    return this.circuitState.consecutiveSuccesses < this.halfOpenRequests;
  }
  
  /**
   * Delay execution for a specified time
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store a failed message for later retry
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  private async storeFailedMessage(pattern: string, payload: any, errorMessage: string): Promise<void> {
    // If no storage is provided, just log the message
    if (!this.failedMessageRepository && !this.fileStorageService) {
      this.logFailedMessage(pattern, payload, errorMessage);
      return;
    }
    
    try {
      if (this.failedMessageRepository) {
        this.logger.log(`Storing failed message for pattern ${pattern} in the database`);
        await this.failedMessageRepository.saveFailedMessage(pattern, payload, errorMessage);
        this.metrics.storedInDatabase++;
        this.logger.log(`Failed message for pattern ${pattern} stored successfully in database`);
      } else if (this.fileStorageService) {
        // Skip database and go directly to file storage
        this.logger.log(`Storing failed message for pattern ${pattern} in file storage`);
        const id = await this.fileStorageService.storeFailedMessage(pattern, payload, errorMessage);
        this.metrics.storedInFile++;
        this.logger.log(`Failed message for pattern ${pattern} stored successfully in file with ID: ${id}`);
      }
    } catch (dbError) {
      this.logger.error(`Error storing failed message in primary storage: ${dbError.message}`, dbError.stack);
      
      // Fall back to file storage if database storage fails and file storage exists
      if (this.failedMessageRepository && this.fileStorageService) {
        try {
          this.logger.log(`Falling back to file storage for pattern ${pattern}`);
          const id = await this.fileStorageService.storeFailedMessage(pattern, payload, errorMessage);
          this.metrics.storedInFile++;
          this.logger.log(`Failed message for pattern ${pattern} stored successfully in file with ID: ${id}`);
        } catch (fileError) {
          this.logger.error(`Error storing failed message in file: ${fileError.message}`, fileError.stack);
          // As a last resort, log the message
          this.logFailedMessage(pattern, payload, errorMessage);
        }
      } else {
        // No alternative storage, just log the message
        this.logFailedMessage(pattern, payload, errorMessage);
      }
    }
  }

  /**
   * Log a failed message as a last resort when no storage is available
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  private logFailedMessage(pattern: string, payload: any, errorMessage: string): void {
    this.logger.error(`CRITICAL: Failed to store message - Pattern: ${pattern}, Error: ${errorMessage}, Payload: ${JSON.stringify(payload)}`);
    // This is a last resort when all storage methods fail
    // In a production system, you might want to send an alert to a monitoring system
  }
} 