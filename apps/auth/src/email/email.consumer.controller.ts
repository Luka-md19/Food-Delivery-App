import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { EmailService } from './services/email.service';

@Controller()
export class EmailConsumerController {
  private readonly logger = new Logger(EmailConsumerController.name);
  
  constructor(private readonly emailService: EmailService) {}

  @MessagePattern('email_verification')
  async handleEmailVerification(data: { email: string; token: string }): Promise<void> {
    this.logger.log(`Processing email verification for ${data.email}`);
    await this.emailService.sendVerificationEmail(data.email, data.token);
  }

  @MessagePattern('forgot_password')
  async handleForgotPassword(data: { email: string; token: string }): Promise<void> {
    this.logger.log(`Processing forgot password for ${data.email}`);
    await this.emailService.sendResetPasswordEmail(data.email, data.token);
  }
}
