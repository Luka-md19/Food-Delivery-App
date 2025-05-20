import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TokenResponse, Jwtpayload, UserRole, LoggerFactory, IEventPublisher, GenericErrorCode as ErrorCode } from '@app/common';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { EVENT_PUBLISHER } from '@app/common/messaging/publishers';
import { JwtService } from '@app/common/jwt';
import * as bcrypt from 'bcryptjs';
import { TokenService } from '../../token/token.service';
import { ResetPasswordService } from '../../reset-password/reset-password.service';
import { randomBytes } from 'crypto';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { User } from '../../users/entities/user.entity';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AuthErrorHandlerService } from '../../common/auth-error-handler.service';
import { UsersService } from '../../users/users.service';
import { IAuthenticationService, ITokenService as IAuthTokenService, IPasswordService, IEmailVerificationService } from './interfaces/auth.interface';
import { EmailService } from '../../email/services/email.service';
import { EmailQueueService } from '../../email/services/email-queue.service';
import { ModuleRef } from '@nestjs/core';

/**
 * Core authentication service 
 * Handles authentication flows including registration, login, token management,
 * and password reset functionality
 */
@Injectable()
export class AuthenticationService implements IAuthenticationService, IAuthTokenService, IPasswordService, IEmailVerificationService {
  private readonly logger = LoggerFactory.getLogger(AuthenticationService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly resetPasswordService: ResetPasswordService,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
    private readonly auditLogService: AuditLogService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Register a new user account
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    try {
      // Validate required fields
      if (!registerDto.email || !registerDto.password || !registerDto.confirmPassword) {
        const errorMessage = 'Email, password, and confirm password are required';
        this.auditLogService.logEvent('REGISTRATION_FAILED', null, { 
          email: registerDto.email, 
          reason: errorMessage,
          errorCode: ErrorCode.VALIDATION_ERROR
        });
        throw new BadRequestException({
          message: errorMessage,
          errorCode: ErrorCode.VALIDATION_ERROR
        });
      }
      
      // Validate password matching
      if (registerDto.password !== registerDto.confirmPassword) {
        const errorMessage = 'Password and confirm password do not match';
        this.auditLogService.logEvent('REGISTRATION_FAILED', null, { 
          email: registerDto.email, 
          reason: errorMessage,
          errorCode: ErrorCode.VALIDATION_ERROR
        });
        throw new BadRequestException({
          message: errorMessage,
          errorCode: ErrorCode.VALIDATION_ERROR
        });
      }
      
      // Create user without email verification
      const { confirmPassword, ...userData } = registerDto;
      const user = await this.usersService.create(userData);

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user with verification details
      await this.usersService.update(user.id, {
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      } as any);

      // Send verification email
      try {
        await this.eventPublisher.publish('email_verification', {
          email: user.email,
          token: verificationToken,
          priority: 1,
        });
        this.logger.log(`Published email_verification event for ${user.email}`);
      } catch (error) {
        this.logger.error(`Error publishing email verification event: ${error.message}`, error.stack);
        
        // Fallback to direct email sending when event publishing fails
        try {
          // Get the email service directly if event publishing fails
          const emailService = this.moduleRef.get(EmailService, { strict: false });
          if (emailService) {
            await emailService.sendVerificationEmail(user.email, verificationToken);
            this.logger.log(`Directly sent verification email to ${user.email} (fallback)`);
          } else {
            this.logger.error(`Failed to get EmailService for direct email sending`);
          }
        } catch (directEmailError) {
          this.logger.error(`Direct email sending failed: ${directEmailError.message}`, directEmailError.stack);
          // Queue the verification email job manually
          try {
            const emailQueueService = this.moduleRef.get(EmailQueueService, { strict: false });
            if (emailQueueService) {
              await emailQueueService.queueVerificationEmail(user.email, verificationToken, 2);
              this.logger.log(`Queued verification email job for ${user.email} (fallback)`);
            } else {
              this.logger.error(`Failed to get EmailQueueService for queueing`);
            }
          } catch (queueError) {
            this.logger.error(`Email queueing failed: ${queueError.message}`, queueError.stack);
          }
        }
      }

      this.auditLogService.logEvent('REGISTRATION', user, { email: user.email });
      return { message: 'Thank you for registering! Please check your email to verify your account.' };
    } catch (error) {
      // Add an audit log entry if we don't have one already
      if (!(error instanceof BadRequestException)) {
        this.auditLogService.logEvent('REGISTRATION_FAILED', null, { 
          email: registerDto.email, 
          reason: error.message,
          errorCode: error.errorCode || ErrorCode.INTERNAL_ERROR
        });
      }
      
      return this.errorHandler.handleRegistrationError(error);
    }
  }

  /**
   * Authenticate a user and return tokens
   */
  async login(loginDto: LoginDto): Promise<TokenResponse> {
    try {
      const user = await this.validateUserCredentials(loginDto.email, loginDto.password);
      
      // Check if account is active
      if (!user.isActive) {
        this.auditLogService.logEvent('LOGIN_FAILED', user, { 
          reason: 'Account inactive', 
          errorCode: ErrorCode.ACCOUNT_INACTIVE 
        });
        throw new UnauthorizedException({
          message: 'Account is inactive. Please contact support for assistance.',
          errorCode: ErrorCode.ACCOUNT_INACTIVE
        });
      }
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        this.auditLogService.logEvent('LOGIN_FAILED', user, { 
          reason: 'Email not verified',
          errorCode: ErrorCode.EMAIL_NOT_VERIFIED 
        });
        throw new UnauthorizedException({
          message: 'Email not verified. Please verify your email before logging in.',
          errorCode: ErrorCode.EMAIL_NOT_VERIFIED
        });
      }
      
      // Generate tokens and log success
      const tokenResponse = await this.generateTokenPair(user, loginDto.deviceInfo);
      this.auditLogService.logEvent('LOGIN_SUCCESS', user, { deviceInfo: loginDto.deviceInfo });
      return tokenResponse;
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        this.auditLogService.logEvent('LOGIN_FAILED', null, { 
          email: loginDto.email, 
          reason: error.message,
          errorCode: error.errorCode || ErrorCode.INTERNAL_ERROR
        });
      }
      return this.errorHandler.handleLoginError(error);
    }
  }

  /**
   * Validate user credentials for login
   */
  async validateUserCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.auditLogService.logEvent('LOGIN_FAILED', null, { 
        email, 
        reason: 'User not found',
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
      throw new UnauthorizedException({
        message: 'Invalid credentials', 
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
    }
    
    // Check account lock status
    if (user.lockUntil && new Date() < user.lockUntil) {
      const lockUntilFormatted = user.lockUntil.toLocaleString();
      this.auditLogService.logEvent('LOGIN_FAILED', user, { 
        reason: 'Account locked', 
        lockUntil: lockUntilFormatted,
        errorCode: ErrorCode.ACCOUNT_LOCKED
      });
      throw new UnauthorizedException({
        message: `Account locked until ${lockUntilFormatted}. Too many failed login attempts.`,
        errorCode: ErrorCode.ACCOUNT_LOCKED,
        metadata: { lockUntil: lockUntilFormatted }
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Update failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = { failedLoginAttempts: failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        updates.lockUntil = lockUntil;
        
        this.auditLogService.logEvent('ACCOUNT_LOCKED', user, { 
          reason: 'Too many failed login attempts',
          lockUntil: lockUntil.toLocaleString(),
          errorCode: ErrorCode.ACCOUNT_LOCKED
        });
      }
      
      await this.usersService.update(user.id, updates);
      
      this.auditLogService.logEvent('LOGIN_FAILED', user, { 
        reason: 'Invalid password', 
        failedAttempts,
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
      
      throw new UnauthorizedException({
        message: 'Invalid credentials', 
        errorCode: ErrorCode.INVALID_CREDENTIALS
      });
    }
    
    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await this.usersService.update(user.id, {
        failedLoginAttempts: 0,
        lockUntil: null
      });
    }
    
    return user;
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Validate refresh token
      const tokenRecord = await this.tokenService.findByRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new UnauthorizedException({
          message: 'Invalid refresh token',
          errorCode: ErrorCode.INVALID_REFRESH_TOKEN
        });
      }
      
      // Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        await this.tokenService.delete(tokenRecord.id);
        throw new UnauthorizedException({
          message: 'Refresh token expired',
          errorCode: ErrorCode.EXPIRED_REFRESH_TOKEN
        });
      }
      
      // Get user
      const user = await this.usersService.findById(tokenRecord.user.id);
      if (!user) {
        throw new UnauthorizedException({
          message: 'User not found',
          errorCode: ErrorCode.USER_NOT_FOUND
        });
      }
      
      // Generate new tokens
      return this.generateTokenPair(user as User, tokenRecord.deviceInfo, refreshToken);
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error.message}`, error.stack);
      return this.errorHandler.handleTokenRefreshError(error);
    }
  }

  /**
   * Generate a new access/refresh token pair
   */
  async generateTokenPair(user: User, deviceInfo?: string, oldRefreshToken?: string): Promise<TokenResponse> {
    // Create JWT payload
    const payload: Jwtpayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      roles: user.roles || [UserRole.USER],
    };
    
    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m' // Short-lived access token
    });
    
    // Create new refresh token
    let refreshToken: string;
    
    if (oldRefreshToken) {
      // Rotate refresh token
      refreshToken = await this.tokenService.rotateRefreshToken(oldRefreshToken);
    } else {
      // Generate new refresh token
      const token = await this.tokenService.createRefreshToken(user, deviceInfo);
      refreshToken = token.token;
    }
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Logout a user by invalidating their tokens
   */
  async logout(userId: string, refreshToken: string, accessToken: string): Promise<{ message: string }> {
    try {
      // Add access token to blacklist
      const tokenPayload = this.jwtService.verify(accessToken);
      const expiryDate = new Date(tokenPayload.exp * 1000);
      
      // Only blacklist if token is not expired
      if (expiryDate > new Date()) {
        await this.tokenBlacklistService.addToBlacklist(accessToken, expiryDate);
      }
      
      // Remove refresh token
      if (refreshToken) {
        await this.tokenService.invalidateRefreshToken(refreshToken);
      }
      
      // Log logout event
      const user = await this.usersService.findById(userId);
      if (user) {
        this.auditLogService.logEvent('LOGOUT', user as User, {});
      }
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      return { message: 'Logged out successfully' }; // Always return success for logout
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: ErrorCode.USER_NOT_FOUND
      });
    }
    return user as User;
  }

  /**
   * Request a password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(email);
      
      // Don't reveal if user exists or not
      if (!user) {
        this.logger.log(`Password reset requested for non-existent email: ${email}`);
        return { 
          message: 'If your email is registered, you will receive a password reset link shortly.' 
        };
      }
      
      // Check if user is active
      if (!user.isActive) {
        this.auditLogService.logEvent('PASSWORD_RESET_FAILED', user, { 
          reason: 'Account inactive'
        });
        return { 
          message: 'If your email is registered, you will receive a password reset link shortly.' 
        };
      }
      
      // Generate reset token
      const resetToken = await this.resetPasswordService.createResetToken(user.id);
      
      // Send reset email
      await this.eventPublisher.publish('send_password_reset', {
        email: user.email,
        token: resetToken,
      });
      
      this.auditLogService.logEvent('PASSWORD_RESET_REQUESTED', user, {});
      
      return { 
        message: 'If your email is registered, you will receive a password reset link shortly.' 
      };
    } catch (error) {
      this.logger.error(`Error in forgot password: ${error.message}`, error.stack);
      return { 
        message: 'If your email is registered, you will receive a password reset link shortly.' 
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Verify token and get user ID
      const userId = await this.resetPasswordService.validateResetToken(token);
      
      // Set new password
      await this.usersService.updatePassword(userId, newPassword);
      
      // Invalidate all user's sessions
      await this.tokenService.invalidateAllUserTokens(userId);
      
      // Invalidate the reset token
      await this.resetPasswordService.invalidateToken(token);
      
      // Log event
      const user = await this.usersService.findById(userId);
      if (user) {
        this.auditLogService.logEvent('PASSWORD_RESET_COMPLETED', user as User, {});
      }
      
      return { message: 'Password has been reset successfully. You can now login with your new password.' };
    } catch (error) {
      return this.errorHandler.handleResetPasswordError(error);
    }
  }

  /**
   * Update current user's password
   */
  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Check if passwords match
      if (newPassword !== confirmNewPassword) {
        throw new BadRequestException({
          message: 'New password and confirmation do not match',
          errorCode: ErrorCode.VALIDATION_ERROR
        });
      }

      // Get user with full details including password
      const user = await this.usersService.findByIdWithPassword(userId);
      if (!user) {
        throw new NotFoundException({
          message: 'User not found',
          errorCode: ErrorCode.USER_NOT_FOUND
        });
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        this.auditLogService.logEvent('PASSWORD_CHANGE_FAILED', user, { 
          reason: 'Incorrect current password'
        });
        throw new UnauthorizedException({
          message: 'Current password is incorrect',
          errorCode: ErrorCode.INVALID_CREDENTIALS
        });
      }

      // Update password
      await this.usersService.updatePassword(userId, newPassword);
      
      // Log event
      this.auditLogService.logEvent('PASSWORD_CHANGED', user, {});
      
      return { message: 'Password updated successfully' };
    } catch (error) {
      return this.errorHandler.handlePasswordChangeError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }> {
    try {
      await this.usersService.update(userId, updateData);
      
      // Log event
      const user = await this.usersService.findById(userId);
      if (user) {
        this.auditLogService.logEvent('PROFILE_UPDATED', user as User, {});
      }
      
      return { message: 'Profile updated successfully' };
    } catch (error) {
      return this.errorHandler.handleProfileUpdateError(error);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Find user by verification token
      const user = await this.usersService.findByVerificationToken(token);
      
      if (!user) {
        this.logger.warn(`Email verification attempted with invalid token: ${token.substring(0, 10)}...`);
        return false;
      }
      
      // Check if token is expired
      if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
        this.auditLogService.logEvent('EMAIL_VERIFICATION_FAILED', user, { 
          reason: 'Token expired' 
        });
        return false;
      }
      
      // Update user as verified
      await this.usersService.update(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });
      
      // Log event
      this.auditLogService.logEvent('EMAIL_VERIFIED', user, {});
      
      return true;
    } catch (error) {
      this.logger.error(`Error verifying email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string; email: string }> {
    try {
      // Get user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException({
          message: 'User not found',
          errorCode: ErrorCode.USER_NOT_FOUND
        });
      }
      
      // Check if already verified
      if (user.isEmailVerified) {
        throw new BadRequestException({
          message: 'Email is already verified',
          errorCode: ErrorCode.EMAIL_ALREADY_VERIFIED
        });
      }
      
      // Generate new verification token
      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Update user with new token
      await this.usersService.update(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });
      
      // Send verification email
      try {
        await this.eventPublisher.publish('email_verification', {
          email: user.email,
          token: verificationToken,
          priority: 2, // Higher priority for resent emails
        });
        this.logger.log(`Published email_verification event for ${user.email} (resend)`);
      } catch (error) {
        this.logger.error(`Error publishing email verification event: ${error.message}`, error.stack);
        
        // Fallback to direct email sending
        try {
          const emailService = this.moduleRef.get(EmailService, { strict: false });
          if (emailService) {
            await emailService.sendVerificationEmail(user.email, verificationToken);
            this.logger.log(`Directly sent verification email to ${user.email} (resend fallback)`);
          } else {
            this.logger.error(`Failed to get EmailService for direct email sending`);
            throw new InternalServerErrorException({
              message: 'Failed to send verification email',
              errorCode: ErrorCode.EMAIL_SEND_FAILED
            });
          }
        } catch (directEmailError) {
          this.logger.error(`Direct email sending failed: ${directEmailError.message}`, directEmailError.stack);
          
          // Try to queue it
          try {
            const emailQueueService = this.moduleRef.get(EmailQueueService, { strict: false });
            if (emailQueueService) {
              await emailQueueService.queueVerificationEmail(user.email, verificationToken, 3);
              this.logger.log(`Queued verification email job for ${user.email} (resend fallback)`);
            } else {
              this.logger.error(`Failed to get EmailQueueService for queueing`);
              throw new InternalServerErrorException({
                message: 'Failed to send verification email',
                errorCode: ErrorCode.EMAIL_SEND_FAILED
              });
            }
          } catch (queueError) {
            this.logger.error(`Email queueing failed: ${queueError.message}`, queueError.stack);
            throw new InternalServerErrorException({
              message: 'Failed to send verification email',
              errorCode: ErrorCode.EMAIL_SEND_FAILED
            });
          }
        }
      }
      
      // Log event
      this.auditLogService.logEvent('VERIFICATION_EMAIL_RESENT', user as User, {});
      
      return { 
        message: 'Verification email has been sent', 
        email: user.email 
      };
    } catch (error) {
      return this.errorHandler.handleResendVerificationError(error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(currentUser: Jwtpayload, sessionId: string): Promise<{ message: string }> {
    await this.tokenService.deleteById(sessionId, currentUser.sub);
    return { message: 'Session revoked successfully' };
  }

  /**
   * Verify an access token
   */
  async verifyAccessToken(token: string): Promise<Jwtpayload | null> {
    try {
      // Check blacklist first
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        return null;
      }
      
      // Verify the token
      const decoded = this.jwtService.verify(token);
      return decoded as Jwtpayload;
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }
  }
} 