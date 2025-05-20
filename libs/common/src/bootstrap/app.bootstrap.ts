import { INestApplication, Type, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '../config/config.service';
import { LoggerFactory } from '../logger';
import { Swaggerservice } from '../swagger';
import { HealthModule } from '../health';

/**
 * Options for setting up Swagger
 */
export interface SwaggerSetupOptions {
  title: string;
  description: string;
  version: string;
  tags?: string[];
}

/**
 * Options for bootstrapping an application
 */
export interface AppBootstrapOptions {
  module: Type<any>;
  serviceName: string;
  setupSwagger?: SwaggerSetupOptions;
  enableCors?: boolean;
  configureHealthCheck?: boolean;
  enableShutdownHooks?: boolean;
}

/**
 * Application bootstrap result
 */
export interface AppBootstrapResult {
  app: INestApplication;
  logger: any;
  configService: AppConfigService;
  instanceId: string;
}

/**
 * Centralized application bootstrap helper
 * Follows the Single Responsibility Principle by focusing on application bootstrapping
 */
export class AppBootstrap {
  /**
   * Create a NestJS application with standardized configuration
   * @param options Bootstrap options
   * @returns The application and related services
   */
  static async create(options: AppBootstrapOptions): Promise<AppBootstrapResult> {
    const { module, serviceName } = options;
    const logger = LoggerFactory.getLogger('Bootstrap');
    
    // Generate a unique instance ID for this service instance
    // This is critical for distributed tracing and log correlation in a scaled environment
    const instanceId = this.generateInstanceId(serviceName);
    logger.log(`Starting ${serviceName} service, instance ID: ${instanceId}`);
    
    // Create the NestJS application
    const app = await NestFactory.create(module, {
      logger: LoggerFactory.getLogger(serviceName),
    });
    
    // Get the configuration service
    const configService = app.get(AppConfigService);
    
    // Set the instance ID in a global context for logging
    // Store these in global context if the method exists
    try {
      // @ts-ignore - Use try-catch since these methods might not exist
      LoggerFactory.setGlobalContext?.('instanceId', instanceId);
      // @ts-ignore
      LoggerFactory.setGlobalContext?.('service', serviceName);
    } catch (e) {
      logger.warn('Could not set global context for logger');
    }
    
    // Enable graceful shutdown for proper scaling operations
    if (options.enableShutdownHooks) {
      app.enableShutdownHooks();
      logger.log('Enabled graceful shutdown hooks');
    }
    
    // Set up global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    
    // Enable CORS if specified
    if (options.enableCors) {
      app.enableCors();
      logger.log('CORS enabled');
    }
    
    // Set up API versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    logger.log('API versioning enabled');
    
    // Set global prefix if configured
    const apiPrefix = configService.get('API_PREFIX');
    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix);
      logger.log(`Global API prefix set to: ${apiPrefix}`);
    }
    
    // Set up Swagger if configured
    if (options.setupSwagger) {
      Swaggerservice.setup(app, options.setupSwagger);
      logger.log('Swagger documentation set up');
    }
    
    // Configure health check if requested
    if (options.configureHealthCheck) {
      try {
        const healthModule = HealthModule.register({ 
          serviceName,
          instanceId,
          hostname: os.hostname(),
        });
        
        // Access provider information safely
        const providers = healthModule.providers || [];
        if (providers.length > 0) {
          // Try to get provider with correct type checking
          const firstProvider = providers[0];
          if (typeof firstProvider === 'object' && firstProvider !== null && 'provide' in firstProvider) {
            app.get(firstProvider.provide);
          }
        }
        
        logger.log('Health check configured');
      } catch (error) {
        logger.error(`Failed to configure health check: ${error.message}`);
      }
    }
    
    // Return the application and related services
    return {
      app,
      logger,
      configService,
      instanceId,
    };
  }
  
  /**
   * Get the Swagger documentation URL
   * @param app The NestJS application
   * @returns The Swagger documentation URL
   */
  static async getSwaggerUrl(app: INestApplication): Promise<string> {
    const configService = app.get(AppConfigService);
    const port = configService.port;
    const host = await this.getServiceHost(configService);
    const apiPrefix = configService.get('API_PREFIX', '');
    
    return `http://${host}:${port}${apiPrefix ? '/' + apiPrefix : ''}/docs`;
  }
  
  /**
   * Get the service host
   * @param configService The configuration service
   * @returns The service host
   */
  private static async getServiceHost(configService: AppConfigService): Promise<string> {
    return configService.get('SERVICE_HOST', 'localhost');
  }
  
  /**
   * Generate a unique instance ID for this service instance
   * @param serviceName The service name
   * @returns A unique instance ID
   */
  private static generateInstanceId(serviceName: string): string {
    // Use Kubernetes pod name if available, otherwise generate UUID
    const podName = process.env.HOSTNAME || process.env.POD_NAME;
    if (podName) {
      return `${serviceName}-${podName}`;
    }
    return `${serviceName}-${uuidv4().substring(0, 8)}`;
  }
} 