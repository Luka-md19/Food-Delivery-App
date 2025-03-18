import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfigService } from '@app/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter;

  constructor(private readonly configService: AppConfigService) {
    const host = this.configService.get<string>('MAILTRAP_HOST');
    const port = this.configService.get<number>('MAILTRAP_PORT');
    const user = this.configService.get<string>('MAILTRAP_USER');
    const pass = this.configService.get<string>('MAILTRAP_PASS');
    
    this.logger.log(`Initializing email service with: ${host}:${port}`);
    
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });
    
    // Verify connection on startup
    this.testMailtrapConnection().then(result => {
      if (result) {
        this.logger.log('Successfully connected to email server');
      } else {
        this.logger.error('Failed to connect to email server');
      }
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('APP_URL')}/auth/verify-email?token=${token}`;
    this.logger.log(`Sending verification email to ${to} with URL: ${verificationUrl}`);
    
    const mailOptions = {
      from: '"Your App" <no-reply@yourapp.com>',
      to,
      subject: 'Email Verification',
      html: `<p>Please verify your email by clicking the link below:</p>
             <a href="${verificationUrl}">${verificationUrl}</a>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}: ${info.response}`);
    } catch (error) {
      this.logger.error(`Error sending verification email: ${error.message}`);
      throw error;
    }
  }

  // New method for sending a reset password email
  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('APP_URL')}/auth/reset-password?token=${token}`;
    const mailOptions = {
      from: '"Your App" <no-reply@yourapp.com>',
      to,
      subject: 'Reset Your Password',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>If you did not request a password reset, please ignore this email.</p>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reset password email sent to ${to}: ${info.response}`);
    } catch (error) {
      this.logger.error(`Error sending reset password email: ${error.message}`);
      throw error;
    }
  }

  async testMailtrapConnection(): Promise<boolean> {
    try {
      const testResult = await this.transporter.verify();
      this.logger.log(`Mailtrap connection test result: ${testResult}`);
      return testResult;
    } catch (error) {
      this.logger.error(`Mailtrap connection test failed: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      return false;
    }
  }
  
  getMailtrapConfig() {
    return {
      host: this.configService.get<string>('MAILTRAP_HOST'),
      port: this.configService.get<number>('MAILTRAP_PORT'),
      user: this.configService.get<string>('MAILTRAP_USER'),
      pass: this.configService.get<string>('MAILTRAP_PASS'),
    };
  }
}
