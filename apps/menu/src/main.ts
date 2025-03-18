import { NestFactory } from '@nestjs/core';
import { MenuModule } from './menu.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfigService, LoggerService, LoggerFactory } from '@app/common';
import { Transport } from '@nestjs/microservices';
import { AllExceptionsFilter } from './filters';
import * as amqp from 'amqplib';
import { Swaggerservice } from '@app/common';

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

async function bootstrap() {
  // Create the application with the custom logger
  const app = await NestFactory.create(MenuModule, {
    logger: LoggerFactory.getLogger('Menu'),
  });
  
  const configService = app.get(AppConfigService);
  const logger = app.get(LoggerService).setContext('Bootstrap');
  
  // Apply global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Configure Swagger documentation using the shared service
  Swaggerservice.setup(app, {
    title: 'Menu Service API',
    description: 'API documentation for the Menu Service',
    version: '1.0',
    tags: ['menus', 'categories', 'menu-items', 'health']
  });
  
  // Get RabbitMQ configuration
  const rabbitmqUrl = configService.get('RABBITMQ_URL', 'amqp://rabbitmq:5672');
  const rabbitmqQueue = configService.get('RABBITMQ_QUEUE', 'menu_service_queue');
  
  // Check if RabbitMQ is ready before starting the application
  logger.log(`Checking RabbitMQ connection at ${rabbitmqUrl}`);
  const isRabbitMQReady = await checkRabbitMQConnection(rabbitmqUrl);
  
  if (!isRabbitMQReady) {
    logger.warn('RabbitMQ is not ready, but proceeding with application startup anyway');
    logger.warn('Messages will be stored locally until RabbitMQ becomes available');
  } else {
    logger.log('RabbitMQ is ready');
  }
  
  // TCP microservice configuration
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get('TCP_PORT', 3003),
    },
  });

  // RabbitMQ microservice configuration
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: rabbitmqQueue,
      queueOptions: {
        durable: true,
      },
    },
  });
  
  logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}, queue: ${rabbitmqQueue}`);
  
  await app.startAllMicroservices();
  await app.listen(configService.port);
  
  logger.log(`HTTP server running on port ${configService.port}`);
  logger.log(`TCP server running on port ${configService.get('TCP_PORT', 3003)}`);
  logger.log(`RabbitMQ consumer started for queue: ${rabbitmqQueue}`);
}

bootstrap();
