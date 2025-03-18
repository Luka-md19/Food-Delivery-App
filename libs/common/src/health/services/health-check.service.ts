import { Injectable, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppConfigService } from '../../config/config.service';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';
import { MongoDBService } from '../../database/mongodb/mongodb.service';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { Redis } from 'ioredis';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Service for checking the health of various dependencies
 * This service follows the Single Responsibility Principle by focusing only on health checks
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = LoggerFactory.getLogger('HealthCheckService');

  constructor(
    private readonly configService: AppConfigService,
    @Optional() @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient?: ClientProxy,
    @Optional() private readonly mongoDBService?: MongoDBService,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis
  ) {}

  /**
   * Perform a health check on all available dependencies
   * @param serviceName The name of the service
   * @returns A health check result
   */
  async check(serviceName: string): Promise<HealthCheckResult> {
    this.logger.log(`Performing health check for ${serviceName}`);
    
    // Initialize dependencies object
    const dependencies: Record<string, 'connected' | 'disconnected'> = {};
    
    // Check RabbitMQ if available
    if (this.rabbitmqClient) {
      dependencies.rabbitmq = await this.checkRabbitMQConnection();
    }
    
    // Check MongoDB if available
    if (this.mongoDBService) {
      dependencies.database = await this.checkMongoDBConnection();
    }
    
    // Check PostgreSQL if available
    if (this.dataSource) {
      dependencies.database = await this.checkPostgresConnection();
    }
    
    // Check Redis if available
    if (this.redisClient) {
      dependencies.redis = await this.checkRedisConnection();
    }
    
    // Determine overall status
    let status: 'ok' | 'degraded' | 'down' = 'ok';
    const dependencyValues = Object.values(dependencies);
    
    if (dependencyValues.length === 0) {
      // No dependencies to check
      status = 'ok';
    } else if (dependencyValues.every(value => value === 'disconnected')) {
      // All dependencies are disconnected
      status = 'down';
    } else if (dependencyValues.some(value => value === 'disconnected')) {
      // Some dependencies are disconnected
      status = 'degraded';
    }
    
    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version: process.env.npm_package_version || '1.0.0',
      port: parseInt(this.configService.get('PORT', '3000'), 10),
      environment: this.configService.get('NODE_ENV', 'development'),
      dependencies
    };
    
    this.logger.log(`Health check result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Check RabbitMQ connection
   * @returns 'connected' or 'disconnected'
   */
  private async checkRabbitMQConnection(): Promise<'connected' | 'disconnected'> {
    try {
      this.logger.log('Checking RabbitMQ connection');
      await this.rabbitmqClient?.connect();
      this.logger.log('RabbitMQ connection successful');
      return 'connected';
    } catch (error) {
      this.logger.warn(`RabbitMQ connection failed: ${error.message}`);
      return 'disconnected';
    }
  }
  
  /**
   * Check MongoDB connection
   * @returns 'connected' or 'disconnected'
   */
  private async checkMongoDBConnection(): Promise<'connected' | 'disconnected'> {
    try {
      this.logger.log('Checking MongoDB connection');
      const db = await this.mongoDBService?.getDb();
      // Perform a simple ping to check if the database is responsive
      await db?.command({ ping: 1 });
      this.logger.log('MongoDB connection successful');
      return 'connected';
    } catch (error) {
      this.logger.warn(`MongoDB connection failed: ${error.message}`);
      return 'disconnected';
    }
  }
  
  /**
   * Check PostgreSQL connection
   * @returns 'connected' or 'disconnected'
   */
  private async checkPostgresConnection(): Promise<'connected' | 'disconnected'> {
    try {
      this.logger.log('Checking PostgreSQL connection');
      if (!this.dataSource.isInitialized) {
        throw new Error('DataSource is not initialized');
      }
      // Execute a simple query to check if the database is responsive
      await this.dataSource.query('SELECT 1');
      this.logger.log('PostgreSQL connection successful');
      return 'connected';
    } catch (error) {
      this.logger.warn(`PostgreSQL connection failed: ${error.message}`);
      return 'disconnected';
    }
  }
  
  /**
   * Check Redis connection
   * @returns 'connected' or 'disconnected'
   */
  private async checkRedisConnection(): Promise<'connected' | 'disconnected'> {
    try {
      this.logger.log('Checking Redis connection');
      // Perform a simple ping to check if Redis is responsive
      await this.redisClient?.ping();
      this.logger.log('Redis connection successful');
      return 'connected';
    } catch (error) {
      this.logger.warn(`Redis connection failed: ${error.message}`);
      return 'disconnected';
    }
  }
} 