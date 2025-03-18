import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { Logger } from '@nestjs/common';

/**
 * Controller for consuming email-related messages from the message queue
 */
@Controller()
export class EmailConsumerController {
  private readonly logger = new Logger(EmailConsumerController.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Handle send email events from the message queue
   * @param data Email data containing recipient, subject, and content
   * @param context RMQ context
   */
  @EventPattern('send_email')
  async handleSendEmail(
    @Payload() data: { to: string; subject: string; content: string },
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received send_email event: ${JSON.stringify(data)}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // Create a custom HTML email with the content
      const mailOptions = {
        from: '"Your App" <no-reply@yourapp.com>',
        to: data.to,
        subject: data.subject,
        html: data.content,
      };
      
      // Use the transporter directly since sendEmail might not exist
      await this.emailService['transporter'].sendMail(mailOptions);
      channel.ack(originalMsg);
      this.logger.log(`Email sent successfully to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg, false, true);
    }
  }

  /**
   * Handle email verification events from the message queue
   * @param data Email verification data containing user email and verification token
   * @param context RMQ context
   */
  @EventPattern('email_verification')
  async handleEmailVerification(
    @Payload() data: { email: string; token: string },
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received email_verification event for user: ${data.email}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.emailService.sendVerificationEmail(data.email, data.token);
      channel.ack(originalMsg);
      this.logger.log(`Verification email sent successfully to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`, error.stack);
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg, false, true);
    }
  }

  /**
   * Handle password reset email events from the message queue
   * @param data Password reset data containing user email and reset token
   * @param context RMQ context
   */
  @EventPattern('send_password_reset')
  async handlePasswordReset(
    @Payload() data: { email: string; token: string },
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received send_password_reset event for user: ${data.email}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.emailService.sendResetPasswordEmail(data.email, data.token);
      channel.ack(originalMsg);
      this.logger.log(`Password reset email sent successfully to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`, error.stack);
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg, false, true);
    }
  }
}
