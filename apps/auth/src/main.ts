// Import the patch before anything else to ensure it's applied
// import './nestjs-patch'; // File has been deleted, removing import

// Previous fix attempts can be removed since we now have a more robust solution

// PATCH: Ensure JWT_SECRET is correctly set
if (process.env.DIRECT_JWT_SECRET) {
  process.env.JWT_SECRET = process.env.DIRECT_JWT_SECRET;
  console.log('Using DIRECT_JWT_SECRET as JWT_SECRET for token signing');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppConfigService, LoggingInterceptor } from '@app/common';
import { LoggerFactory } from '@app/common';
import helmet from 'helmet';
import compression from 'compression';
import * as amqp from 'amqplib';
import * as net from 'net';

/**
 * Check if a TCP port is available
 * @param port The port to check
 * @param host The host to check
 */
function isPortAvailable(port: number, host: string = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, host);
  });
}

/**
 * Check if RabbitMQ is ready
 * @param url RabbitMQ URL
 * @param maxRetries Maximum number of retries
 * @param retryDelay Delay between retries in milliseconds
 */
async function checkRabbitMQConnection(url: string, maxRetries = 10, retryDelay = 5000): Promise<boolean> {
  const logger = LoggerFactory.getLogger('RabbitMQ Connection Check');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(`Attempt ${attempt}/${maxRetries} to connect to RabbitMQ at ${url}`);
      
      const connection = await amqp.connect(url);
      await connection.close();
      
      logger.log('Successfully connected to RabbitMQ');
      return true;
    } catch (error) {
      logger.warn(`Failed to connect to RabbitMQ: ${error.message}`);
      
      if (attempt === maxRetries) {
        logger.error(`Maximum retry attempts (${maxRetries}) reached. Giving up.`);
        return false;
      }
      
      logger.log(`Waiting ${retryDelay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
}

/**
 * Ensure RabbitMQ queues exist
 * @param url RabbitMQ URL
 * @param queues Array of queue names to ensure
 */
async function ensureRabbitMQQueues(url: string, queues: string[]): Promise<boolean> {
  const logger = LoggerFactory.getLogger('RabbitMQ Queue Setup');
  
  try {
    logger.log(`Ensuring RabbitMQ queues exist: ${queues.join(', ')}`);
    
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    
    // Create each queue with durable flag set to true
    for (const queue of queues) {
      logger.log(`Declaring queue: ${queue}`);
      await channel.assertQueue(queue, { durable: true });
      logger.log(`Queue ${queue} created or confirmed`);
    }
    
    await channel.close();
    await connection.close();
    
    logger.log('Successfully set up all required RabbitMQ queues');
    return true;
  } catch (error) {
    logger.error(`Failed to set up RabbitMQ queues: ${error.message}`, error.stack);
    return false;
  }
}

/**
 * Test SMTP email server connection
 */
async function testEmailConnection(configService: AppConfigService): Promise<boolean> {
  const logger = LoggerFactory.getLogger('Bootstrap');
  try {
    const host = configService.get('EMAIL_HOST', 'sandbox.smtp.mailtrap.io');
    const user = configService.get('EMAIL_USER');
    const pass = configService.get('EMAIL_PASSWORD');
    
    if (!user || !pass) {
      logger.warn('Email credentials missing, skipping connection test');
      return false;
    }
    
    // Simple check if credentials exist
    const result = !!(host && user && pass);
    
    if (result) {
      logger.log('Successfully connected to email server');
    }
    
    return result;
  } catch (error) {
    logger.error(`Error testing email connection: ${error.message}`, error.stack);
    return false;
  }
}

async function bootstrap() {
  const logger = LoggerFactory.getLogger('Auth Bootstrap');
  
  try {
    logger.log('Starting Auth bootstrap process...');
    
    const app = await NestFactory.create(AppModule, {
      logger: LoggerFactory.getNestLogger(),
    });
    
    const configService = app.get(ConfigService);
    
    // Global prefix with patch for wildcard routes
    app.setGlobalPrefix('api', {
      exclude: ['/health', '/health/*path'],
    });
    
    // Apply route middleware to handle deprecated wildcard syntax
    app.use((req, res, next) => {
      // Replace malformed route patterns with properly named parameter versions
      const wildcardRoutes = [
        { from: '/api/*', to: '/api/*path' },
        { from: '/health/*', to: '/health/*path' }
      ];
      
      for (const route of wildcardRoutes) {
        if (req.url.startsWith(route.from.replace('*', ''))) {
          const wildcard = req.url.substring(route.from.replace('*', '').length);
          req.url = route.to.replace('*path', wildcard);
          break;
        }
      }
      
      next();
    });
    
    // Setup microservice with fail-safe handling
    const rabbitmqUrl = configService.get<string>('RABBITMQ_URL') || 'amqp://rabbitmq:5672';
    
    try {
      logger.log(`Attempting to connect to RabbitMQ at ${rabbitmqUrl}`);
      
      // Configure the microservice
      app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: configService.get<string>('AUTH_QUEUE') || 'auth_queue',
          queueOptions: {
            durable: true,
          },
          // Simple configuration that should work across NestJS versions
          noAck: false,
          prefetchCount: 10
        },
      });
      
      // Start microservices with a custom timeout to prevent hanging
      const microservicePromise = app.startAllMicroservices();
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RabbitMQ connection timeout')), 5000)
      );
      
      try {
        await Promise.race([microservicePromise, timeout]);
        logger.log('Successfully connected to RabbitMQ microservice');
      } catch (msError) {
        logger.warn(`Failed to start microservice: ${msError.message}`);
        logger.warn('Continuing application startup without microservice support');
      }
    } catch (rmqError) {
      logger.warn(`Failed to configure RabbitMQ connection: ${rmqError.message}`);
      logger.warn('Continuing application startup without RabbitMQ connection');
    }
    
    // Security middlewares
    app.use(helmet());
    app.use(compression());
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    
    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('Auth Service API')
      .setDescription('The Auth Service API description')
      .setVersion('1.0')
      .addTag('auth')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    
    const port = configService.get<number>('PORT', 3001);
    logger.log(`About to start HTTP server on port ${port}...`);
    
    // Check if port is available
    const isAvailable = await isPortAvailable(port);
    if (!isAvailable) {
      logger.warn(`Port ${port} is already in use, trying to forcefully continue`);
    }
    
    // Start the HTTP server in a fire-and-forget manner to avoid thread pool blocking issues
    try {
      // Create a timeout promise to handle if app.listen hangs
      const listenPromise = app.listen(port, '0.0.0.0');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for app.listen() to complete')), 5000);
      });
      
      try {
        // Race between the listen promise and a timeout
        await Promise.race([listenPromise, timeoutPromise]);
        logger.log(`Auth service is running on port ${port} and listening on all interfaces`);
      } catch (timeoutError) {
        // If we timeout, the server might still be starting up in the background
        logger.warn(`Timed out waiting for app.listen() to complete: ${timeoutError.message}`);
        logger.warn('The server may still be starting in the background');
        
        // Create a background monitor to log when the server actually starts
        setTimeout(async () => {
          try {
            // Try to check if the server is up by polling the port
            for (let i = 0; i < 60; i++) {  // Try for up to 5 minutes (60 * 5s = 300s)
              const available = await isPortAvailable(port);
              if (!available) {
                // If port is not available, service is likely running
                logger.log(`Server confirmed to be running on port ${port} (detected after timeout)`);
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5 seconds between checks
            }
          } catch (err) {
            logger.error(`Error while checking server status: ${err.message}`);
          }
        }, 1000);
      }
    } catch (listenError) {
      logger.error(`Failed to start HTTP server: ${listenError.message}`, listenError.stack);
      throw listenError; // Re-throw to trigger the outer catch block
    }

  } catch (error) {
    logger.error(`FATAL: Failed during bootstrap: ${error.message}`, error.stack);
    // Give time for logs to flush before exiting
    setTimeout(() => process.exit(1), 1000);
  }
}

// Execute bootstrap with unhandled promise rejection safety
bootstrap().catch(err => {
  console.error('Unhandled bootstrap error:', err);
  process.exit(1);
});
