import './polyfills';
import { NestFactory, Reflector } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { AppConfigService, LoggerService, Swaggerservice, LoggerFactory } from '@app/common';

async function bootstrap() {
  // Create the application with the custom logger
  const app = await NestFactory.create(AuthModule, {
    logger: LoggerFactory.getLogger('Auth'),
  });
  
  const configService = app.get(AppConfigService);
  const logger = app.get(LoggerService).setContext('Bootstrap');

  // Global configuration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );
  app.enableCors();

  // Swagger setup
  Swaggerservice.setup(app, {
    title: 'Auth Service API',
    description: 'Authentication and Authorization Service',
    version: '1.0',
    tags: ['auth'],
  });

  // TCP microservice configuration
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get('TCP_PORT', 3001),
    },
  });

  // RabbitMQ microservice configuration
  const useDocker = configService.get<string>('USE_DOCKER', 'false');
  const isDocker = useDocker === 'true';
  const rabbitmqUrl = configService.get(
    'RABBITMQ_URL',
    isDocker ? 'amqp://rabbitmq:5672' : 'amqp://localhost:5672'
  );
  const rabbitmqQueue = configService.get('RABBITMQ_QUEUE', 'email_verification');

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
  logger.log(`TCP server running on port ${configService.get('TCP_PORT', 3001)}`);
  logger.log(`RabbitMQ consumer started for queue: ${rabbitmqQueue}`);
  logger.log(`Swagger documentation available at ${configService.get('SWAGGER_PATH', 'api/docs')}`);
  logger.log('Rate limiting enabled with custom headers and error handling');
}

bootstrap();
