import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EmailService } from '../services/email.service';
import { EmailQueueService } from '../services/email-queue.service';
import { LoggerFactory } from '@app/common';

@Controller()
export class EmailConsumerController {
  private readonly logger = LoggerFactory.getLogger(EmailConsumerController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailQueueService: EmailQueueService
  ) {}

  @EventPattern('send_email')
  async handleSendEmail(
    @Payload() data: { to: string; subject: string; text: string; html: string },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    
    this.logger.log(`Received send_email event: ${JSON.stringify(data)}`);
    
    try {
      // This code is just a placeholder since we don't have a generic email sending method
      // You might want to add a generic method to the EmailService
      this.logger.log(`Would send email to: ${data.to}, subject: ${data.subject}`);
      
      // Acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      // Negative acknowledge the message to retry
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern('email_verification')
  async handleEmailVerification(
    @Payload() data: { email: string; token: string; priority?: number },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    
    this.logger.log(`Received email_verification event for ${data.email}`);
    
    try {
      // Queue the verification email instead of sending directly
      // This helps with retries and error handling
      await this.emailQueueService.queueVerificationEmail(
        data.email,
        data.token,
        data.priority || 0
      );
      
      // Acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Failed to queue verification email for ${data.email}: ${error.message}`, error.stack);
      // Negative acknowledge the message to retry
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern('send_password_reset')
  async handlePasswordResetEmail(
    @Payload() data: { email: string; token: string },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    
    this.logger.log(`Received password_reset event for ${data.email}`);
    
    try {
      await this.emailService.sendResetPasswordEmail(data.email, data.token);
      
      // Acknowledge the message
      channel.ack(originalMsg);
      
      this.logger.log(`Successfully sent password reset email to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${data.email}: ${error.message}`, error.stack);
      // Negative acknowledge the message to retry
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern('retry_failed_email')
  async handleRetryFailedEmail(
    @Payload() data: { jobId: string },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    
    this.logger.log(`Received retry_failed_email event for job ${data.jobId}`);
    
    try {
      await this.emailQueueService.retryJob(data.jobId);
      
      // Acknowledge the message
      channel.ack(originalMsg);
      
      this.logger.log(`Successfully queued retry for job ${data.jobId}`);
    } catch (error) {
      this.logger.error(`Failed to retry email job ${data.jobId}: ${error.message}`, error.stack);
      // Negative acknowledge the message
      channel.nack(originalMsg, false, false); // Don't requeue as it might be a permanent error
    }
  }
} 