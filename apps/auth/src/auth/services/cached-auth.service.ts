import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthFacade } from '../auth.facade';
import { CacheService } from '@app/common/redis/cache.service';
import { User } from '../../users/entities/user.entity';
import { LoginResultDto, PayloadDto, RegistrationResultDto, TokensResponseDto } from '../../dto/auth.dto';
import { LoggerFactory } from '@app/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../../dto/login.dto';
import { RegisterDto } from '../../dto/register.dto';
import { ServiceTokenResponse, Jwtpayload } from '@app/common';
import { ICachedAuthService } from './interfaces/auth.interface';
import { RefreshToken } from '../../token/entities/refresh-token.entity';
import { GenericErrorCode as ErrorCode } from '@app/common';
import { InvalidCredentialsException } from '@app/common/exceptions/auth-exceptions';

@Injectable()
export class CachedAuthService implements ICachedAuthService {
  private readonly logger = LoggerFactory.getLogger(CachedAuthService.name);
  
  // Cache TTLs in seconds
  private readonly USER_PROFILE_CACHE_TTL = 300; // 5 minutes
  private readonly USER_VALIDATION_CACHE_TTL = 60; // 1 minute
  private readonly TOKEN_VERIFICATION_CACHE_TTL = 60; // 1 minute
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly authFacade: AuthFacade,
    private readonly cacheService: CacheService,
    private readonly authService: AuthService,
  ) {
    this.logger.log('CachedAuthService initialized');
  }

  /**
   * Validate a user's credentials with caching
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // Don't cache passwords, always delegate to the underlying service
    return this.authService.validateUser(email, password);
  }

  /**
   * Login a user by credentials
   */
  async login(loginDto: LoginDto): Promise<LoginResultDto> {
    try {
      // Validate credentials
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      
      if (!user) {
        throw new InvalidCredentialsException();
      }
      
      // Login the user
      return this.authService.login(user);
    } catch (error) {
      // Properly handle authentication errors
      if (error instanceof InvalidCredentialsException || 
          error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new InvalidCredentialsException();
    }
  }

  /**
   * Login a user with an already validated user object
   */
  async loginWithUser(user: User): Promise<LoginResultDto> {
    // Don't cache login results, always generate fresh tokens
    return this.authService.login(user);
  }

  /**
   * Register a new user with cache invalidation
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { firstName, lastName, email, password } = registerDto;
    
    // Construct a name from firstName and lastName
    const name = `${firstName} ${lastName}`;
    
    // Use authService directly for the new user registration
    const result = await this.authService.register(name, email, password);
    
    // Invalidate any cached profile with this email
    const cacheKeyEmail = `user_email:${email}`;
    await this.cacheService.delete(cacheKeyEmail);
    
    // Cache the new profile if we have user information
    if (result.user?.id) {
      const cacheKeyId = `user_profile:${result.user.id}`;
      await this.cacheService.set(cacheKeyId, result.user, this.USER_PROFILE_CACHE_TTL);
    }
    
    return { message: 'User registered successfully. Please check your email inbox (or Mailtrap if in development) to verify your account.' };
  }

  /**
   * Generate a JWT token for a service-to-service authentication
   */
  async generateServiceToken(serviceDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse> {
    // Always generate fresh tokens, don't cache
    return this.authFacade.generateServiceToken(serviceDto);
  }

  /**
   * Refresh tokens using a valid refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokensResponseDto> {
    // Don't cache token refresh operations
    return this.authService.refreshTokens(refreshToken);
  }

  /**
   * Alias for refreshTokens to match AuthFacade API
   */
  async refreshAccessToken(refreshToken: string): Promise<TokensResponseDto> {
    return this.refreshTokens(refreshToken);
  }

  /**
   * Logout a user by revoking all refresh tokens
   */
  async logout(userId: string, refreshToken?: string, accessToken?: string): Promise<{ message: string }> {
    await this.authService.logout(userId);
    
    // Invalidate cached user profile
    const cacheKey = `user_profile:${userId}`;
    await this.cacheService.delete(cacheKey);
    
    return { message: 'Logout successful' };
  }

  /**
   * Verify if a token is valid with caching
   */
  async verifyToken(token: string): Promise<PayloadDto | null> {
    // Create a cache key based on the token (using a hash to avoid storing the actual token)
    const cacheKey = `token_verify:${this.hashToken(token)}`;
    
    // Try to get from cache first
    const cachedResult = await this.cacheService.get<PayloadDto>(cacheKey);
    if (cachedResult) {
      this.logger.debug('Token verification result found in cache');
      return cachedResult;
    }
    
    // If not in cache, verify and store
    const result = await this.authService.verifyToken(token);
    
    // Only cache valid tokens
    if (result) {
      await this.cacheService.set(cacheKey, result, this.TOKEN_VERIFICATION_CACHE_TTL);
    }
    
    return result;
  }

  /**
   * Get the full profile of a user with caching
   */
  async getUserProfile(userId: string): Promise<Partial<User>> {
    const cacheKey = `user_profile:${userId}`;
    
    // Try to get from cache first
    const cachedProfile = await this.cacheService.get<Partial<User>>(cacheKey);
    if (cachedProfile) {
      this.logger.debug(`User profile found in cache for user: ${userId}`);
      return cachedProfile;
    }
    
    // If not in cache, get from service and store
    const profile = await this.authService.getUserProfile(userId);
    
    if (profile) {
      await this.cacheService.set(cacheKey, profile, this.USER_PROFILE_CACHE_TTL);
    }
    
    return profile;
  }

  // Alias for getUserProfile to match AuthFacade API
  async getUserById(userId: string): Promise<Partial<User>> {
    return this.getUserProfile(userId);
  }

  /**
   * Password reset request functionality
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    // This is a write operation, so we don't cache it
    // Just forward to AuthFacade
    await this.authFacade.forgotPassword(email);
    return { message: 'Password reset instructions have been sent to your email' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // This is a write operation, so we don't cache it
    return this.authFacade.resetPassword(token, newPassword);
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<boolean> {
    return this.authFacade.verifyEmail(token);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string; email: string }> {
    return this.authFacade.resendVerificationEmail(userId);
  }

  /**
   * Invalidate all cached user data
   */
  async invalidateUserCache(userId: string): Promise<void> {
    this.logger.debug(`Invalidating cache for user: ${userId}`);
    
    const cacheKeys = [
      `user_profile:${userId}`,
    ];
    
    for (const key of cacheKeys) {
      await this.cacheService.delete(key);
    }
  }

  /**
   * Update the user profile in cache
   */
  async updateCachedUserProfile(userId: string, profile: User): Promise<void> {
    const cacheKey = `user_profile:${userId}`;
    await this.cacheService.set(cacheKey, profile, this.USER_PROFILE_CACHE_TTL);
  }

  /**
   * Simple hash function for tokens (for cache key generation)
   * Note: This is NOT for security, just to avoid storing raw tokens in cache keys
   */
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get active sessions for a user with caching
   */
  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    const cacheKey = `user_sessions:${userId}`;
    
    // Try to get from cache first
    const cachedSessions = await this.cacheService.get<RefreshToken[]>(cacheKey);
    if (cachedSessions) {
      this.logger.debug(`Active sessions found in cache for user: ${userId}`);
      return cachedSessions;
    }
    
    // If not in cache, get from authFacade and store
    const sessions = await this.authFacade.getActiveSessions(userId);
    
    if (sessions && sessions.length > 0) {
      // Cache for a shorter period since sessions can change frequently
      await this.cacheService.set(cacheKey, sessions, 60); // Cache for 1 minute
    }
    
    return sessions;
  }

  /**
   * Revoke a specific session (logout from a device)
   */
  async revokeSession(user: Jwtpayload, sessionId: string): Promise<{ message: string }> {
    // This is a write operation, so we don't use cache for the operation itself
    const result = await this.authFacade.revokeSession(user, sessionId);
    
    // Invalidate the sessions cache for this user
    const sessionsKey = `user_sessions:${user.userId}`;
    await this.cacheService.delete(sessionsKey);
    
    return result;
  }

  /**
   * Update a user's profile
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }> {
    const result = await this.authFacade.updateProfile(userId, updateData);
    
    // Invalidate cached user profile
    await this.invalidateUserCache(userId);
    
    return result;
  }

  /**
   * Delete a user account
   */
  async deleteAccount(userId: string): Promise<void> {
    // This is a write operation, so we don't cache it
    await this.authFacade.deleteAccount(userId);
    
    // Invalidate cached user profile
    await this.invalidateUserCache(userId);
  }

  /**
   * Update a user's password
   */
  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }> {
    // This is a write operation, so we don't cache it
    const result = await this.authFacade.updatePassword(
      userId,
      oldPassword,
      newPassword,
      confirmNewPassword
    );
    
    // Invalidate cached user profile
    await this.invalidateUserCache(userId);
    
    return result;
  }
} 