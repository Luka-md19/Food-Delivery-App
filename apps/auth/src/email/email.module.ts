import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailConsumerController } from './email.consumer.controller';


@Module({
  providers: [EmailService],
  controllers: [EmailConsumerController],
  exports: [EmailService],
})
export class EmailModule {} 