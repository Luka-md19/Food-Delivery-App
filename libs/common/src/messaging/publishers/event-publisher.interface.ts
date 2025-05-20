/**
 * Interface for EventPublisher
 * Defines the contract for publishing events with circuit breaker and retry functionality
 */
export interface IEventPublisher {
  /**
   * Publish an event to the message broker
   * @param pattern The event pattern
   * @param payload The event payload
   */
  publish(pattern: string, payload: any): Promise<void>;
  
  /**
   * Initialize the publisher
   */
  initialize(): Promise<void>;
  
  /**
   * Get current metrics for the publisher
   */
  getMetrics(): PublisherMetrics;
}

/**
 * Publisher metrics for monitoring
 */
export interface PublisherMetrics {
  totalPublished: number;
  successfulPublishes: number;
  failedPublishes: number;
  storedInDatabase: number;
  storedInFile: number;
  circuitBreaks: number;
}

/**
 * Circuit state enum
 */
export enum CircuitStatus {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Configuration options for the event publisher
 */
export interface EventPublisherOptions {
  maxRetries?: number;
  retryDelay?: number;
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
  successThreshold?: number;
  connectionCheckDelay?: number;
} 