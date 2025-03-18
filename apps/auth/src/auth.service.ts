import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../src/users/users.service';
import { TokenResponse, Jwtpayload, UserRole, TokenBlacklistService } from '@app/common';
import { TokenService } from './token/token.service';
import { ResetPasswordService } from './Reset-Password/reset-password.service';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './users/entities/user.entity';
import { EmailService } from './email/email.service';
import { ClientProxy } from '@nestjs/microservices';
import { RefreshToken } from './token/entities/refresh-token.entity';
import { AuditLogService } from './audit-log/audit-log.service'; // Added import

interface GoogleUserDto {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly emailService: EmailService,
    @Inject('EMAIL_SERVICE')
    private readonly emailClient: ClientProxy,
    private readonly auditLogService: AuditLogService, 
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    try {
      if (!registerDto.email || !registerDto.password || !registerDto.confirmPassword) {
        throw new BadRequestException('Email, password, and confirm password are required');
      }
      if (registerDto.password !== registerDto.confirmPassword) {
        throw new BadRequestException('Password and confirm password do not match');
      }
      const { confirmPassword, ...userData } = registerDto;
      const user = await this.usersService.create(userData);

      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.usersService.update(user.id, {
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      } as any);

      this.emailClient.emit('email_verification', {
        email: user.email,
        token: verificationToken,
      }).subscribe({
        next: () => this.logger.log(`Published email_verification event for ${user.email}`),
        error: err => this.logger.error('Error publishing email event', err),
      });

      this.auditLogService.logEvent('REGISTRATION', user, { email: user.email });
      return { message: 'Thank you for registering! Please check your email to verify your account.' };
    } catch (error) {
      this.logger.error('Registration error: ' + error.message);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.validateUserCredentials(loginDto.email, loginDto.password);
    if (!user.isActive) {
      this.auditLogService.logEvent('LOGIN_FAILED', user, { reason: 'Account inactive' });
      throw new UnauthorizedException('Account is inactive');
    }
    if (!user.isEmailVerified) {
      this.auditLogService.logEvent('LOGIN_FAILED', user, { reason: 'Email not verified' });
      throw new UnauthorizedException('Email not verified. Please verify your email before logging in.');
    }
    const tokenResponse = await this.generateTokenPair(user, loginDto.deviceInfo);
    this.auditLogService.logEvent('LOGIN_SUCCESS', user, { deviceInfo: loginDto.deviceInfo });
    return tokenResponse;
  }

  async validateUserCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.auditLogService.logEvent('LOGIN_FAILED', null, { email, reason: 'User not found' });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.lockUntil && new Date() < user.lockUntil) {
      this.auditLogService.logEvent('LOGIN_FAILED', user, { reason: 'Account locked' });
      throw new UnauthorizedException(`Account locked until ${user.lockUntil.toLocaleString()}`);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.usersService.recordFailedLoginAttempt(user);
      this.auditLogService.logEvent('LOGIN_FAILED', user, { reason: 'Invalid password' });
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.usersService.resetFailedLoginAttempts(user);
    return user;
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<Jwtpayload>(refreshToken);
      const user = await this.usersService.getUserEntity(payload.userId);
      await this.tokenService.validateRefreshToken(user, refreshToken);
      const tokenResponse = await this.generateTokenPair(user);
      this.auditLogService.logEvent('TOKEN_REFRESHED', user);
      return tokenResponse;
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`);
      this.auditLogService.logEvent('TOKEN_REFRESH_FAILED', null, { reason: error.message });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string): Promise<Jwtpayload | null> {
    try {
      return this.jwtService.verify<Jwtpayload>(token);
    } catch {
      return null;
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const token = await this.resetPasswordService.createResetToken(email);
      this.emailClient.emit('forgot_password', { email, token }).subscribe({
        next: () => this.logger.log(`Published forgot_password event for ${email}`),
        error: err => this.logger.error('Error publishing forgot password event', err),
      });
      this.auditLogService.logEvent('FORGOT_PASSWORD_REQUEST', null, { email });
      return { message: 'Password reset token generated. Check your email for further instructions.' };
    } catch (error) {
      this.logger.error(`Forgot password error: ${error.message}`);
      this.auditLogService.logEvent('FORGOT_PASSWORD_FAILED', null, { email, reason: error.message });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const user = await this.resetPasswordService.resetPassword(token, newPassword);
      this.auditLogService.logEvent('PASSWORD_RESET', user);
      return { message: 'Password has been reset successfully.' };
    } catch (error) {
      this.logger.error(`Reset password error: ${error.message}`);
      this.auditLogService.logEvent('PASSWORD_RESET_FAILED', null, { token, reason: error.message });
      throw error;
    }
  }

  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }> {
    if (newPassword !== confirmNewPassword) {
      const user = await this.usersService.getUserEntity(userId);
      this.auditLogService.logEvent('PASSWORD_CHANGE_FAILED', user, { reason: 'Passwords do not match' });
      throw new BadRequestException('New password and confirm password do not match');
    }
    const user = await this.usersService.getUserEntity(userId);
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      this.auditLogService.logEvent('PASSWORD_CHANGE_FAILED', user, { reason: 'Invalid old password' });
      throw new BadRequestException('Old password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    this.auditLogService.logEvent('PASSWORD_CHANGE', user);
    return { message: 'Password updated successfully.' };
  }

  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }> {
    try {
      await this.usersService.update(userId, updateData as any);
      const user = await this.usersService.getUserEntity(userId);
      this.auditLogService.logEvent('PROFILE_UPDATE', user, { updateData });
      return { message: 'User profile updated successfully.' };
    } catch (error) {
      this.logger.error(`Profile update error: ${error.message}`);
      throw error;
    }
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    try {
      const user = await this.usersService.getUserEntity(userId);
      await this.usersService.deleteUser(userId);
      this.auditLogService.logEvent('ACCOUNT_DELETED', user);
      return { message: 'User account deleted successfully.' };
    } catch (error) {
      this.logger.error(`User deletion error: ${error.message}`);
      throw error;
    }
  }

  async logout(userId: string, refreshToken: string, accessToken: string): Promise<{ message: string }> {
    try {
      const user = await this.usersService.getUserEntity(userId);
      // Remove the refresh token
      await this.tokenService.removeRefreshToken(user, refreshToken);

      // Decode the access token to determine its expiration
      const decoded = this.jwtService.decode(accessToken) as { exp: number } | null;
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = decoded.exp - currentTime;
        if (remainingTime > 0) {
          // Blacklist the access token for the remaining duration
          await this.tokenBlacklistService.blacklistToken(accessToken, remainingTime);
        }
      }

      this.auditLogService.logEvent('LOGOUT', user, { refreshToken });
      return { message: 'User logged out successfully.' };
    } catch (error) {
      this.logger.error(`Logout error: ${error.message}`);
      this.auditLogService.logEvent('LOGOUT_FAILED', null, { userId, reason: error.message });
      throw error;
    }
  }


  async validateGoogleUser(googleUser: GoogleUserDto): Promise<TokenResponse> {
    const { googleId, email, firstName, lastName } = googleUser;
    let user = await this.usersService.findByEmail(email);
    if (user) {
      if (!user.googleId) {
        user = await this.usersService.updateGoogleId(user.id, googleId);
      }
    } else {
      const createUserDto = {
        email,
        password: null,
        firstName,
        lastName,
        roles: [UserRole.CUSTOMER],
        isActive: true,
        googleId,
      };
      user = await this.usersService.create(createUserDto);
      this.auditLogService.logEvent('GOOGLE_REGISTRATION', user, { email });
    }
    const tokenResponse = await this.generateTokenPair(user);
    this.auditLogService.logEvent('GOOGLE_LOGIN_SUCCESS', user);
    return tokenResponse;
  }

  async generateTokenPair(user: User, deviceInfo?: string): Promise<TokenResponse> {
    const payload: Jwtpayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    await this.tokenService.createRefreshToken(user, refreshToken);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      this.auditLogService.logEvent('EMAIL_VERIFICATION_FAILED', null, { token, reason: 'Invalid token' });
      return false;
    }
    await this.usersService.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    } as any);
    this.auditLogService.logEvent('EMAIL_VERIFIED', user);
    return true;
  }

  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.tokenService.getActiveSessions(userId);
  }

  async revokeSession(currentUser: Jwtpayload, sessionId: string): Promise<{ message: string }> {
    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);
    return this.tokenService.revokeSession(currentUser.userId, sessionId, isAdmin);
  }
}