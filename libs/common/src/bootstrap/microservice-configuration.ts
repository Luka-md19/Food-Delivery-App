import { Transport, MicroserviceOptions, RmqOptions } from '@nestjs/microservices';

/**
 * RabbitMQ queue options
 */
export interface RmqQueueOptions {
  durable?: boolean;
  noAssert?: boolean;
  prefetchCount?: number;
  reconnect?: {
    strategy?: 'exponential' | 'linear' | 'fixed';
    retries?: number;
    min?: number;
    max?: number;
    factor?: number;
  };
  [key: string]: any;
}

/**
 * Helper class for configuring microservices
 */
export class MicroserviceConfiguration {
  /**
   * Create TCP microservice configuration
   * @param port Port to listen on
   * @param host Host to bind to
   * @returns TCP microservice configuration
   */
  static createTcpConfig(port: number | string, host: string = '0.0.0.0'): MicroserviceOptions {
    return {
      transport: Transport.TCP,
      options: {
        host,
        port: typeof port === 'string' ? parseInt(port, 10) : port,
      },
    };
  }

  /**
   * Create RabbitMQ microservice configuration
   * @param url RabbitMQ URL or array of URLs
   * @param queue Queue name
   * @param queueOptions Queue options including reconnection settings
   * @returns RabbitMQ microservice configuration
   */
  static createRmqConfig(
    url: string | string[], 
    queue: string, 
    queueOptions: RmqQueueOptions = { durable: true }
  ): RmqOptions {
    // Extract reconnection options if present
    const { reconnect, ...options } = queueOptions;
    
    return {
      transport: Transport.RMQ,
      options: {
        urls: Array.isArray(url) ? url : [url],
        queue,
        queueOptions: options,
        prefetchCount: queueOptions.prefetchCount || 10,
        noAssert: queueOptions.noAssert || false,
        isGlobalPrefetchCount: false,
        // Add reconnection options if provided
        ...(reconnect && { 
          reconnect: true,
          reconnectAttempts: reconnect.retries || 10,
          retryAttempts: reconnect.retries || 10,
          retryDelay: reconnect.min || 1000,
        }),
      },
    };
  }

  /**
   * Create Redis microservice configuration
   * @param host Redis host
   * @param port Redis port
   * @returns Redis microservice configuration
   */
  static createRedisConfig(host: string, port: number | string): MicroserviceOptions {
    return {
      transport: Transport.REDIS,
      options: {
        host,
        port: typeof port === 'string' ? parseInt(port, 10) : port,
      },
    };
  }

  /**
   * Create Kafka microservice configuration
   * @param brokers Array of Kafka broker URLs
   * @param clientId Client ID
   * @param consumerGroup Consumer group ID
   * @returns Kafka microservice configuration
   */
  static createKafkaConfig(
    brokers: string[], 
    clientId: string, 
    consumerGroup: string
  ): MicroserviceOptions {
    return {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId,
          brokers,
        },
        consumer: {
          groupId: consumerGroup,
        },
      },
    };
  }
} 