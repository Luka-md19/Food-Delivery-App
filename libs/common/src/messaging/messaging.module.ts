import { Module, Global } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Global()
@Module({
  providers: [
    {
      provide: 'RABBITMQ_CLIENT',
      useFactory: () => {
        // Determine if we're running in Docker or production
        const isDocker = process.env.USE_DOCKER === 'true' || process.env.NODE_ENV === 'production';
        // If RABBITMQ_URL is provided, use it; otherwise, choose based on our flag.
        const url = process.env.RABBITMQ_URL || (isDocker ? 'amqp://rabbitmq:5672' : 'amqp://localhost:5672');
        
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [url],
            queue: process.env.RABBITMQ_QUEUE || 'default_queue',
            queueOptions: {
              durable: true,
            },
          },
        });
      },
    },
  ],
  exports: ['RABBITMQ_CLIENT'],
})
export class MessagingModule {}
