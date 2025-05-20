import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { LoggerFactory } from '@app/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/services/email.service';
import { TokenService } from '../token/token.service';
import { ResetPasswordService } from '../reset-password/reset-password.service';
import { AuthenticationService } from './services/authentication.service';
import { ServiceAuthService } from './services/service-auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { TokenResponse, Jwtpayload, ServiceTokenResponse } from '@app/common';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../token/entities/refresh-token.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SocialAuthService } from './services/social-auth.service';
import { AuthService } from './services/auth.service';
import { IAuthFacade } from './services/interfaces/auth.interface';

/**
 * Auth Facade Service
 * 
 * This service provides a clean API for all authentication-related operations,
 * delegating to specialized services for each specific responsibility.
 * 
 * Using the facade pattern helps organize the complex authentication logic
 * without exposing the internal implementation details.
 */
@Injectable()
export class AuthFacade implements IAuthFacade {
  private readonly logger = LoggerFactory.getLogger(AuthFacade.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly authenticationService: AuthenticationService,
    private readonly serviceAuthService: ServiceAuthService,
    private readonly socialAuthService: SocialAuthService,
    private readonly auditLogService: AuditLogService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    return this.authenticationService.register(registerDto);
  }

  /**
   * User login
   */
  async login(loginDto: LoginDto): Promise<TokenResponse> {
    return this.authenticationService.login(loginDto);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    return this.authenticationService.refreshAccessToken(refreshToken);
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string, accessToken: string): Promise<{ message: string }> {
    return this.authenticationService.logout(userId, refreshToken, accessToken);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.authenticationService.forgotPassword(email);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.authenticationService.resetPassword(token, newPassword);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    return this.authenticationService.getUserById(userId);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    return this.authenticationService.verifyEmail(token);
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.tokenService.getActiveSessions(userId);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(currentUser: Jwtpayload, sessionId: string): Promise<{ message: string }> {
    return this.authenticationService.revokeSession(currentUser, sessionId);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string; email: string }> {
    return this.authenticationService.resendVerificationEmail(userId);
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }> {
    return this.authenticationService.updatePassword(userId, oldPassword, newPassword, confirmNewPassword);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }> {
    return this.authenticationService.updateProfile(userId, updateData);
  }

  /**
   * Generate service token
   */
  async generateServiceToken(serviceTokenDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse> {
    return this.serviceAuthService.generateServiceToken(serviceTokenDto);
  }

  /**
   * Validate user credentials
   */
  async validateUserCredentials(email: string, password: string): Promise<User> {
    return this.authenticationService.validateUserCredentials(email, password);
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<Jwtpayload | null> {
    try {
      // Call the authentication service to verify the token
      return await this.authenticationService.verifyAccessToken(token);
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Authenticate or create a user via Google OAuth
   */
  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<TokenResponse> {
    return this.socialAuthService.validateGoogleUser(googleUser);
  }

  /**
   * Delete a user account
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      // First get the user to verify it exists
      const user = await this.usersService.findById(userId);
      
      if (!user) {
        this.logger.warn(`Attempted to delete non-existent user: ${userId}`);
        return;
      }
      
      // Revoke all tokens for the user
      await this.tokenService.revokeAllTokens(userId);
      
      // Delete the user account
      await this.usersService.deleteUser(userId);
      
      // Audit the account deletion
      this.auditLogService.logEvent('ACCOUNT_DELETED', { id: userId, email: user.email } as User, {});
      
      this.logger.log(`User account deleted: ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting account ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }
} 