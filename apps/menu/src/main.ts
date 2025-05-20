import { MenuModule } from './menu.module';
import { 
  AppConfigService, 
  LoggerFactory, 
  AppBootstrap,
  MicroserviceConfiguration,
  ServiceTokenInterceptor 
} from '@app/common';
import * as amqp from 'amqplib';
import { AllExceptionsFilter } from './filters';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

/**
 * Masks sensitive information in connection strings
 * @param url Connection string to mask
 * @returns A masked version of the connection string
 */
function maskConnectionString(url: string): string {
  if (!url) return '[undefined]';
  try {
    // Mask credentials in various connection string formats
    return url.replace(/(amqp|mongodb|redis)(\+srv)?:\/\/([^:]+):([^@]+)@/g, '$1$2://[username]:[password]@');
  } catch {
    return '[invalid-url-format]';
  }
}

/**
 * Masks all sensitive environment variables
 */
function setupSecureLogging() {
  // Define sensitive environment variables to mask
  const sensitiveEnvVars = [
    'MONGODB_URI',
    'MONGODB_PASSWORD',
    'DATABASE_PASSWORD',
    'JWT_SECRET',
    'RABBITMQ_URL',
    'SERVICE_API_KEY',
    'GOOGLE_CLIENT_SECRET',
    'EMAIL_PASSWORD',
    'ACCESS_KEY',
    'SECRET_KEY'
  ];
  
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;
  
  // Create a global store for original environment variables that can be accessed by the app
  global._originalEnvVars = {};
  
  // Store original sensitive values without modifying process.env
  sensitiveEnvVars.forEach(key => {
    if (process.env[key]) {
      global._originalEnvVars[key] = process.env[key];
    }
  });
  
  // Helper function to mask sensitive data in strings
  const maskSensitiveData = (data: any): any => {
    if (typeof data !== 'string') return data;
    
    let result = data;
    
    // Mask connection strings
    result = result.replace(
      /(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)(@[^'"]+)/gi,
      '$1[password]$4'
    );
    
    // Mask other sensitive environment variables
    sensitiveEnvVars.forEach(envVar => {
      if (global._originalEnvVars[envVar]) {
        const regex = new RegExp(global._originalEnvVars[envVar], 'g');
        result = result.replace(regex, `[${envVar}]`);
      }
    });
    
    return result;
  };
  
  // Override console methods to mask sensitive data
  console.log = (...args) => {
    originalConsoleLog(...args.map(maskSensitiveData));
  };
  
  console.error = (...args) => {
    originalConsoleError(...args.map(maskSensitiveData));
  };
  
  console.warn = (...args) => {
    originalConsoleWarn(...args.map(maskSensitiveData));
  };
  
  console.info = (...args) => {
    originalConsoleInfo(...args.map(maskSensitiveData));
  };
  
  console.debug = (...args) => {
    originalConsoleDebug(...args.map(maskSensitiveData));
  };
  
  // Setup global error handler to prevent credential leaks in stack traces
  process.on('uncaughtException', (error) => {
    // Mask any potential sensitive data in the error message and stack
    const maskedMessage = maskSensitiveData(error.message);
    const maskedStack = maskSensitiveData(error.stack);
    
    originalConsoleError(`Uncaught Exception: ${maskedMessage}`);
    originalConsoleError(maskedStack);
  });
}

// Call secure logging setup before anything else
setupSecureLogging();

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
      logger.log(`Attempt ${attempt}/${maxRetries} to connect to RabbitMQ at ${maskConnectionString(url)}`);
      
      const connection = await amqp.connect(url);
      await connection.close();
      
      logger.log('Successfully connected to RabbitMQ');
      return true;
    } catch (error) {
      // Mask any connection strings in error message
      const safeErrorMessage = error.message?.replace(/(amqp|mongodb|redis):\/\/([^:]+):([^@]+)@/g, '$1://[username]:[password]@') || 'Unknown error';
      logger.warn(`Failed to connect to RabbitMQ: ${safeErrorMessage}`);
      
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
    // Ensure no sensitive data in error logs
    const safeErrorMessage = error.message?.replace(/(amqp|mongodb|redis):\/\/([^:]+):([^@]+)@/g, '$1://[username]:[password]@') || 'Unknown error';
    logger.error(`Failed to set up RabbitMQ queues: ${safeErrorMessage}`, error.stack);
    return false;
  }
}

/**
 * Generate a unique instance ID
 */
function generateInstanceId(serviceName: string): string {
  const podName = process.env.POD_NAME || process.env.HOSTNAME;
  if (podName) {
    return `${serviceName}-${podName}`;
  }
  return `${serviceName}-${uuidv4().substring(0, 8)}`;
}

async function bootstrap() {
  // Generate a unique instance ID
  const instanceId = generateInstanceId('menu');
  const hostname = os.hostname();
  
  // Use shared AppBootstrap to create the application
  const { app, logger, configService } = await AppBootstrap.create({
    module: MenuModule,
    serviceName: 'Menu',
    setupSwagger: {
      title: 'Menu Service API',
      description: 'API documentation for the Menu Service',
      version: '1.0',
      tags: ['menus', 'categories', 'menu-items', 'health']
    },
    enableCors: true,
    configureHealthCheck: true,
    enableShutdownHooks: true,
  });
  
  // Log the instance ID
  logger.log(`Started Menu service instance with ID: ${instanceId} on host: ${hostname}`);
  
  // Get dependencies for AllExceptionsFilter
  const failedMessageRepository = app.get('IFailedMessageRepository');
  const fileStorageService = app.get('IFileStorageService');
  
  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(failedMessageRepository, fileStorageService));
  
  // Get RabbitMQ configuration
  const rabbitmqUrl = configService.get('RABBITMQ_URL', 'amqp://rabbitmq:5672');
  const rabbitmqQueue = configService.get('RABBITMQ_QUEUE', 'menu_service_queue');
  
  // Define required queues for this service
  const requiredQueues = [
    rabbitmqQueue,
    'menu_events',
    'menu_update_notifications'
  ];
  
  // Check if RabbitMQ is ready before starting the application
  logger.log(`Checking RabbitMQ connection at ${maskConnectionString(rabbitmqUrl)}`);
  const isRabbitMQReady = await checkRabbitMQConnection(rabbitmqUrl);
  
  if (!isRabbitMQReady) {
    logger.warn('RabbitMQ is not ready, but proceeding with application startup anyway');
    logger.warn('Messages will be stored locally until RabbitMQ becomes available');
  } else {
    logger.log('RabbitMQ is ready');
    
    // Ensure queues exist
    const queuesSetup = await ensureRabbitMQQueues(rabbitmqUrl, requiredQueues);
    if (queuesSetup) {
      logger.log('Required RabbitMQ queues successfully set up');
    } else {
      logger.warn('Failed to set up RabbitMQ queues, but continuing with application startup');
    }
  }
  
  // Get service token interceptor for microservice communication
  const serviceTokenInterceptor = app.get(ServiceTokenInterceptor);
  
  // Add the service token interceptor globally to all microservice requests
  app.useGlobalInterceptors(serviceTokenInterceptor);
  
  // TCP microservice configuration using shared utility
  const tcpConfig = MicroserviceConfiguration.createTcpConfig(
    configService.get('TCP_PORT', 3003),
    '0.0.0.0'
  );
  app.connectMicroservice(tcpConfig);
  
  // RabbitMQ microservice configuration using shared utility
  const rmqConfig = MicroserviceConfiguration.createRmqConfig(
    rabbitmqUrl,
    rabbitmqQueue,
    { 
      durable: true,
      // Add additional options for better resilience
      noAssert: false, // Changed to false to allow automatic queue creation
      prefetchCount: 10,
      reconnect: {
        strategy: 'exponential',
        retries: 100,
        min: 1000,  // 1 second
        max: 60000, // 1 minute
      }
    }
  );
  app.connectMicroservice(rmqConfig);
  
  logger.log(`Connecting to RabbitMQ at ${maskConnectionString(rabbitmqUrl)}, queue: ${rabbitmqQueue}`);
  
  try {
    // Start all microservices with error handling
    await app.startAllMicroservices();
    logger.log('Microservices started successfully');
  } catch (error) {
    // Ensure no sensitive data in error logs
    const safeErrorMessage = error.message?.replace(/(amqp|mongodb|redis):\/\/([^:]+):([^@]+)@/g, '$1://[username]:[password]@') || 'Unknown error';
    logger.error(`Error starting microservices: ${safeErrorMessage}`, error.stack);
    // Continue app startup anyway to allow HTTP API to function
    logger.warn('Continuing application startup despite microservice errors');
  }
  
  // Start the HTTP server
  await app.listen(configService.port);
  
  logger.log(`[${instanceId}] HTTP server running on port ${configService.port}`);
  logger.log(`[${instanceId}] TCP server running on port ${configService.get('TCP_PORT', 3003)}`);
  logger.log(`[${instanceId}] RabbitMQ consumer started for queue: ${rabbitmqQueue}`);
  logger.log(`[${instanceId}] Swagger documentation available at ${await AppBootstrap.getSwaggerUrl(app)}`);
  
  // Set up RabbitMQ reconnection if it wasn't ready initially
  if (!isRabbitMQReady) {
    const reconnectInterval = setInterval(async () => {
      try {
        const reconnected = await checkRabbitMQConnection(rabbitmqUrl, 1, 1000);
        if (reconnected) {
          logger.log(`[${instanceId}] RabbitMQ connection established on retry`);
          
          // Ensure queues exist after reconnection
          const queuesSetup = await ensureRabbitMQQueues(rabbitmqUrl, requiredQueues);
          if (queuesSetup) {
            logger.log(`[${instanceId}] RabbitMQ queues successfully set up after reconnection`);
          }
          
          clearInterval(reconnectInterval);
        }
      } catch (error) {
        // Ensure no sensitive data in error logs
        const safeErrorMessage = error.message?.replace(/(amqp|mongodb|redis):\/\/([^:]+):([^@]+)@/g, '$1://[username]:[password]@') || 'Unknown error';
        logger.warn(`[${instanceId}] RabbitMQ reconnection attempt failed: ${safeErrorMessage}`);
      }
    }, 30000); // Try reconnecting every 30 seconds
  }
}

bootstrap().catch(err => {
  const logger = LoggerFactory.getLogger('Bootstrap');
  // Ensure no sensitive data in error logs
  const safeErrorMessage = err.message?.replace(/(amqp|mongodb|redis):\/\/([^:]+):([^@]+)@/g, '$1://[username]:[password]@') || 'Unknown error';
  logger.error(`Error during bootstrap: ${safeErrorMessage}`, err.stack);
  process.exit(1);
});
