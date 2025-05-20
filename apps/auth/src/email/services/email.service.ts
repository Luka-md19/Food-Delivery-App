import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfigService, LoggerFactory } from '@app/common';
import { IEmailService } from '../interfaces/email-service.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = LoggerFactory.getLogger(EmailService.name);
  private transporter;

  constructor(private readonly configService: AppConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    
    this.logger.log(`Initializing email service with: ${host}:${port}`);
    
    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
      });
    } catch (error) {
      this.logger.error(`Failed to create email transporter: ${error.message}`);
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') || '"Your App" <no-reply@yourapp.com>',
      to,
      subject: 'Email Verification',
      html: `<p>Please verify your email by clicking the link below:</p>
             <a href="${verificationUrl}">${verificationUrl}</a>
             <p>If the above link doesn't work, copy and paste this URL into your browser: ${verificationUrl}</p>`,
    };

    try {
      if (!this.transporter) {
        return;
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending verification email: ${error.message}`);
      throw error;
    }
  }

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const resetUrl = `${appUrl}/api/auth/reset-password?token=${token}`;
    
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') || '"Your App" <no-reply@yourapp.com>',
      to,
      subject: 'Reset Your Password',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>If the above link doesn't work, copy and paste this URL into your browser: ${resetUrl}</p>
             <p>If you did not request a password reset, please ignore this email.</p>`,
    };

    try {
      if (!this.transporter) {
        return;
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reset password email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending reset password email: ${error.message}`);
      throw error;
    }
  }

  async testMailtrapConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      
      const testResult = await this.transporter.verify();
      return testResult;
    } catch (error) {
      return false;
    }
  }
  
  getMailtrapConfig() {
    return {
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      user: this.configService.get<string>('EMAIL_USER'),
      pass: this.configService.get<string>('EMAIL_PASSWORD'),
    };
  }
} 