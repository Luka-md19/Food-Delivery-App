import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailVerificationJob } from './entities/email-verification-job.entity';
import { EmailConsumerController } from './controllers/email.consumer.controller';
import { EmailJobsController } from './controllers/email-jobs.controller';
import { ConfigModule } from '@nestjs/config';
import { EmailConsumerService } from './services/email-consumer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationJob]),
    ConfigModule,
  ],
  controllers: [EmailConsumerController, EmailJobsController],
  providers: [EmailService, EmailQueueService, EmailConsumerService],
  exports: [EmailService, EmailQueueService, EmailConsumerService]
})
export class EmailModule {} 