import { Injectable, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppConfigService } from '../../config/config.service';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';
import { MongoDBService } from '../../database/mongodb/mongodb.service';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { Redis } from 'ioredis';
import { LoggerFactory } from '../../logger/logger.factory';
import * as os from 'os';

/**
 * ServiceMetrics interface for collecting performance data
 */
export interface ServiceMetrics {
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Memory usage in MB */
  memoryUsageMB: number;
  
  /** Available memory in MB */
  availableMemoryMB: number;
  
  /** Process uptime in seconds */
  processUptimeSec: number;
  
  /** Active connections */
  activeConnections?: number;
}

/**
 * Service for checking the health of various dependencies
 * This service follows the Single Responsibility Principle by focusing only on health checks
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = LoggerFactory.getLogger('HealthCheckService');
  private startTime: number = Date.now();

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
   * @param instanceId The unique ID of this service instance
   * @param hostname The hostname of this instance
   * @returns A health check result
   */
  async check(
    serviceName: string, 
    instanceId?: string, 
    hostname?: string
  ): Promise<HealthCheckResult> {
    this.logger.log(`Performing health check for ${serviceName}${instanceId ? ` (${instanceId})` : ''}`);
    
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
    
    // Collect performance metrics
    const metrics = await this.collectMetrics();
    
    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      service: serviceName,
      instanceId: instanceId || 'default',
      hostname: hostname || os.hostname(),
      version: process.env.npm_package_version || '1.0.0',
      port: parseInt(this.configService.get('PORT', '3000'), 10),
      environment: this.configService.get('NODE_ENV', 'development'),
      dependencies,
      metrics,
    };
    
    this.logger.log(`Health check result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Collect performance metrics for this service instance
   * This is important for horizontal scaling decisions
   */
  private async collectMetrics(): Promise<ServiceMetrics> {
    // Calculate uptime
    const uptime = (Date.now() - this.startTime) / 1000;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.rss / (1024 * 1024));
    const availableMemoryMB = Math.round(os.freemem() / (1024 * 1024));
    
    // Get CPU usage (this is approximate without additional libraries)
    // For more accurate CPU measurements in production, consider using a monitoring solution
    const cpuUsage = Math.round(process.cpuUsage().user / 1000000); // Convert to seconds
    
    return {
      cpuUsage,
      memoryUsageMB,
      availableMemoryMB, 
      processUptimeSec: uptime,
      // We could add more metrics here like active connections
    };
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
      
      // Use the lightweight healthCheck method instead of database operations
      const isHealthy = await this.mongoDBService?.healthCheck();
      
      if (isHealthy) {
        this.logger.log('MongoDB connection successful');
        return 'connected';
      } else {
        throw new Error('MongoDB connection check failed');
      }
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