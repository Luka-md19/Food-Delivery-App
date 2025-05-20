import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoggerFactory } from '../logger/logger.factory';
import { LoggerService } from '../logger/logger.service';
import { Swaggerservice } from '../swagger/swagger.service';
import { AppConfigService } from '../config';
import { RateLimitExceptionFilter } from '../rate-limiter/filters/rate-limit-exception.filter';
import * as bodyParser from 'body-parser';


/**
 * Options for application bootstrap
 */
export interface AppBootstrapOptions {
  /**
   * The root module of the application
   */
  module: Type<any>;
  
  /**
   * Service name for logging
   */
  serviceName: string;
  
  /**
   * Swagger setup options
   */
  setupSwagger?: {
    title: string;
    description: string;
    version: string;
    tags?: string[];
  };
  
  /**
   * Whether to enable CORS
   * @default true
   */
  enableCors?: boolean;
  
  /**
   * Whether to configure the health check endpoint
   * @default true
   */
  configureHealthCheck?: boolean;
  
  /**
   * Whether to enable shutdown hooks
   * @default true
   */
  enableShutdownHooks?: boolean;
}

/**
 * Result of application bootstrap
 */
export interface AppBootstrapResult {
  app: INestApplication;
  logger: LoggerService;
  configService: AppConfigService;
}

/**
 * Helper class for bootstrapping NestJS applications with common configurations
 */
export class AppBootstrap {
  /**
   * Create and configure a NestJS application with common settings
   */
  static async create(options: AppBootstrapOptions): Promise<AppBootstrapResult> {
    // Create application
    const app = await NestFactory.create(options.module, {
      logger: LoggerFactory.getLogger(options.serviceName),
      bodyParser: true
    });
    
    // Get services
    const configService = app.get(AppConfigService);
    const logger = LoggerFactory.getLogger('Bootstrap');
    
    // Configure body parser limits
    const bodyLimit = configService.get('HTTP_BODY_LIMIT', '10mb');
    app.use(bodyParser.json({ limit: bodyLimit }));
    app.use(bodyParser.urlencoded({ limit: bodyLimit, extended: true }));
    logger.log(`Body parser configured with limit: ${bodyLimit}`);
    
    // Set global prefix if configured
    const apiPrefix = configService.get('API_PREFIX');
    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix);
    }
    
    // Configure validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );
    
    // Explicitly register the RateLimitExceptionFilter with a higher priority
    app.useGlobalFilters(new RateLimitExceptionFilter());
    logger.log('Registered RateLimitExceptionFilter globally');
    
    // Enable CORS if needed
    if (options.enableCors !== false) {
      app.enableCors({
        origin: true, // Allow all origins or specify domains
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
        exposedHeaders: [
          'X-RateLimit-Limit', 
          'X-RateLimit-Remaining', 
          'X-RateLimit-Reset', 
          'Retry-After',
          'X-Dynamic-RateLimit-Service',
          'X-RateLimit-Policy'
        ],
        credentials: true,
        maxAge: 3600 // 1 hour
      });
      logger.log('CORS enabled with custom configuration');
    }
    
    // Set up Swagger if needed
    if (options.setupSwagger) {
      Swaggerservice.setup(app, options.setupSwagger);
    }
    
    // Enable shutdown hooks if needed
    if (options.enableShutdownHooks !== false) {
      app.enableShutdownHooks();
    }
    
    return { app, logger, configService };
  }
  
  /**
   * Get the full Swagger URL including host
   */
  static async getSwaggerUrl(app: INestApplication): Promise<string> {
    const configService = app.get(AppConfigService);
    const swaggerPath = configService.get('SWAGGER_PATH', 'api/docs');
    
    // Get the URL where the app is listening
    const url = await app.getUrl();
    const baseUrl = url.replace(/\/$/, '');
    
    return `${baseUrl}/${swaggerPath}`;
  }
} 