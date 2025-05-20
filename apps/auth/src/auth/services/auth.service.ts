import { Injectable, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { User } from '../../users/entities/user.entity';
import { TokenManagerService } from '../../token/services/token-manager.service';
import { 
  PayloadDto, 
  LoginResultDto, 
  TokensResponseDto, 
  RegistrationResultDto 
} from '../../dto/auth.dto';
import { UsersService } from '../../users/users.service';
import { AppConfigService, LoggerFactory } from '@app/common';
import { AuthEvents } from '../../dto/auth-events.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AuditAction } from '../../audit-log/audit-action.enum';
import { IAuthService } from './interfaces/auth.interface';
import { randomBytes } from 'crypto';
import { EVENT_PUBLISHER } from '@app/common/messaging/publishers';
import { IEventPublisher } from '@app/common/messaging/publishers/event-publisher.interface';
import { ModuleRef } from '@nestjs/core';
import { EmailQueueService } from '../../email/services/email-queue.service';
import { EmailService } from '../../email/services/email.service';

/**
 * Core authentication service for the application
 * Provides login, registration, token validation and user profile functions
 */
@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = LoggerFactory.getLogger(AuthService.name);
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    @Inject('TOKEN_MANAGER_SERVICE')
    private readonly tokenManagerService: TokenManagerService,
    private readonly usersService: UsersService,
    private readonly configService: AppConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
    private readonly moduleRef: ModuleRef,
  ) {
    this.accessTokenExpiration = this.configService.get('JWT_ACCESS_EXPIRATION', '1h');
    this.refreshTokenExpiration = this.configService.get('JWT_REFRESH_EXPIRATION', '7d');
    
    this.logger.log(`Auth service initialized with access token expiration: ${this.accessTokenExpiration}`);
    this.logger.log(`Auth service initialized with refresh token expiration: ${this.refreshTokenExpiration}`);
  }

  /**
   * Validate a user's credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    this.logger.debug(`Validating user credentials for ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.debug(`User not found with email: ${email}`);
      return null;
    }
    
    if (!user.isActive) {
      this.logger.debug(`User ${email} is not active`);
      return null;
    }
    
    const isPasswordValid = await compare(password, user.password);
    
    if (!isPasswordValid) {
      this.logger.debug(`Invalid password for user ${email}`);
      return null;
    }
    
    // Don't include password in the returned user object
    delete user.password;
    
    return user;
  }

  /**
   * Login a user and return tokens
   */
  async login(user: User): Promise<LoginResultDto> {
    this.logger.log(`User logged in: ${user.email}`);
    
    // Create payload for token
    const payload: PayloadDto = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      roles: user.roles,
    };
    
    // Generate tokens
    const tokens = await this.getTokens(payload);
    
    // Get full user entity
    const fullUser = await this.usersService.getUserEntity(user.id);
    
    // Store refresh token
    await this.tokenManagerService.createRefreshToken(
      fullUser,
      'web-login',
      tokens.refreshToken
    );
    
    // Log the login event
    this.eventEmitter.emit(AuthEvents.USER_LOGIN, {
      userId: user.id,
      email: user.email,
    });
    
    // Create audit log
    await this.auditLogService.create({
      userId: user.id,
      action: AuditAction.LOGIN,
      details: {
        email: user.email,
        method: 'credentials',
      },
    });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        roles: user.roles,
      },
      tokens,
    };
  }

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string): Promise<RegistrationResultDto> {
    this.logger.log(`Registering new user: ${email}`);
    
    // Split the name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Create user
    const user = await this.usersService.create({
      firstName,
      lastName,
      email, 
      password
    });
    
    // Create payload for token
    const payload: PayloadDto = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      roles: user.roles,
    };
    
    // Generate tokens
    const tokens = await this.getTokens(payload);
    
    // Get full user entity to ensure we have all required properties
    const fullUser = await this.usersService.getUserEntity(user.id);
    
    // Store refresh token
    await this.tokenManagerService.createRefreshToken(
      fullUser,
      'web-registration',
      tokens.refreshToken
    );
    
    // Generate verification token and set expiry (24 hours)
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user with verification details
    await this.usersService.update(user.id, {
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    } as any);

    // Try both methods to send verification email
    try {
      
      // 3. Use direct email service (only method we're keeping)
      try {
        const emailService = this.moduleRef.get(EmailService, { strict: false });
        if (emailService) {
          await emailService.sendVerificationEmail(user.email, verificationToken);
          this.logger.log(`Directly sent verification email to ${user.email}`);
        }
      } catch (emailError) {
        this.logger.error(`Direct email sending failed: ${emailError.message}`);
        throw new Error('Failed to send verification email');
      }
      
    } catch (error) {
      this.logger.error(`Error in email verification process: ${error.message}`, error.stack);
    }
    
    // Create audit log
    await this.auditLogService.create({
      userId: user.id,
      action: AuditAction.REGISTER,
      details: {
        email: user.email,
        method: 'credentials',
      },
    });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        roles: user.roles,
      },
      tokens,
      isVerified: false,
    };
  }

  /**
   * Generate a JWT token for a service-to-service authentication
   */
  generateServiceToken(serviceName: string): string {
    this.logger.log(`Generating service token for ${serviceName}`);
    
    const payload = {
      service: serviceName,
      type: 'service',
    };
    
    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiration,
    });
  }

  /**
   * Refresh an expired access token using a refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokensResponseDto> {
    this.logger.debug('Refreshing tokens');
    
    // Validate the refresh token
    const token = await this.tokenManagerService.findByToken(refreshToken);
    
    if (!token) {
      this.logger.warn('Invalid refresh token provided');
      throw new Error('Invalid refresh token');
    }
    
    if (token.isRevoked) {
      this.logger.warn(`Refresh token ${token.id} has been revoked`);
      throw new Error('Refresh token has been revoked');
    }
    
    if (token.expiresAt < new Date()) {
      this.logger.warn(`Refresh token ${token.id} has expired`);
      throw new Error('Refresh token has expired');
    }
    
    // Load the full user entity
    const user = await this.usersService.getUserEntity(token.userId);
    
    if (!user) {
      this.logger.warn(`User not found for token ${token.id}`);
      throw new Error('User not found');
    }
    
    // Create a payload for the new tokens
    const payload: PayloadDto = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      roles: user.roles,
    };
    
    // Generate new tokens
    const tokens = await this.getTokens(payload);
    
    // Revoke the old token and create a new one
    await this.tokenManagerService.deleteToken(token.id);
    await this.tokenManagerService.createRefreshToken(
      user,
      token.deviceInfo,
      tokens.refreshToken
    );
    
    // Log the token refresh
    this.auditLogService.create({
      userId: user.id,
      action: AuditAction.TOKEN_REFRESH,
      details: {
        tokenId: token.id,
      },
    });
    
    return tokens;
  }

  /**
   * Logout a user by revoking all their refresh tokens
   */
  async logout(userId: string): Promise<void> {
    this.logger.debug(`Logging out user ${userId}`);
    
    try {
      // Revoke all user's tokens
      await this.tokenManagerService.revokeAllTokens(userId);
      
      // Log the logout
      const user = await this.usersService.findById(userId);
      if (user) {
        this.auditLogService.create({
          userId: user.id,
          action: AuditAction.LOGOUT,
          details: {},
        });
      }
    } catch (error) {
      this.logger.error(`Error during logout for user ${userId}: ${error.message}`);
      // We don't throw here, as logout should be considered successful even if token revocation fails
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async getTokens(payload: PayloadDto): Promise<TokensResponseDto> {
    this.logger.debug(`Generating tokens for ${payload.email}`);
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiration,
    });
    
    const refreshToken = this.generateRandomString(40);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirationSeconds(this.accessTokenExpiration),
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): PayloadDto | null {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get a user's profile
   */
  async getUserProfile(userId: string): Promise<Partial<User>> {
    this.logger.debug(`Getting profile for user ${userId}`);
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return only safe user fields
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Generate a random string for use as a token
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Convert a time expression to seconds
   */
  private getExpirationSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default to 15 minutes in seconds
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }
} 