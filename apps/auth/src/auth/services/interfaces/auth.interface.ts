import { TokenResponse, Jwtpayload, ServiceTokenResponse } from '@app/common';
import { User } from '../../../users/entities/user.entity';
import { RegisterDto } from '../../../dto/register.dto';
import { LoginDto } from '../../../dto/login.dto';
import { RefreshToken } from '../../../token/entities/refresh-token.entity';
import { LoginResultDto, PayloadDto, RegistrationResultDto, TokensResponseDto } from '../../../dto/auth.dto';

/**
 * Interface for authentication-related operations
 */
export interface IAuthenticationService {
  /**
   * Register a new user account
   */
  register(registerDto: RegisterDto): Promise<{ message: string }>;

  /**
   * Authenticate a user and return tokens
   */
  login(loginDto: LoginDto): Promise<TokenResponse>;

  /**
   * Validate user credentials for login
   */
  validateUserCredentials(email: string, password: string): Promise<User>;

  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<User>;

  /**
   * Update user profile
   */
  updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }>;
}

/**
 * Interface for token-related operations
 */
export interface ITokenService {
  /**
   * Generate a new access/refresh token pair
   */
  generateTokenPair(user: User, deviceInfo?: string, oldRefreshToken?: string): Promise<TokenResponse>;

  /**
   * Refresh an access token using a refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;

  /**
   * Logout a user by invalidating their tokens
   */
  logout(userId: string, refreshToken: string, accessToken: string): Promise<{ message: string }>;

  /**
   * Revoke a specific session
   */
  revokeSession(currentUser: Jwtpayload, sessionId: string): Promise<{ message: string }>;

  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): Promise<Jwtpayload | null>;
}

/**
 * Interface for password-related operations
 */
export interface IPasswordService {
  /**
   * Request a password reset
   */
  forgotPassword(email: string): Promise<{ message: string }>;

  /**
   * Reset password using token
   */
  resetPassword(token: string, newPassword: string): Promise<{ message: string }>;

  /**
   * Update current user's password
   */
  updatePassword(
    userId: string, 
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }>;
}

/**
 * Interface for email verification operations
 */
export interface IEmailVerificationService {
  /**
   * Verify email with token
   */
  verifyEmail(token: string): Promise<boolean>;

  /**
   * Resend verification email
   */
  resendVerificationEmail(userId: string): Promise<{ message: string; email: string }>;
}

/**
 * Interface for social authentication operations
 */
export interface ISocialAuthService {
  /**
   * Authenticate or create a user via Google OAuth
   */
  validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<TokenResponse>;
}

/**
 * Interface for service-to-service authentication
 */
export interface IServiceAuthService {
  /**
   * Generate a service token
   */
  generateServiceToken(serviceTokenDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse>;
}

/**
 * Interface for the auth facade that combines all auth-related functionality
 */
export interface IAuthFacade extends IAuthenticationService, IPasswordService, IEmailVerificationService {
  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;

  /**
   * Logout user
   */
  logout(userId: string, refreshToken: string, accessToken: string): Promise<{ message: string }>;

  /**
   * Get active sessions for a user
   */
  getActiveSessions(userId: string): Promise<RefreshToken[]>;

  /**
   * Revoke a specific session
   */
  revokeSession(currentUser: Jwtpayload, sessionId: string): Promise<{ message: string }>;

  /**
   * Delete a user account
   */
  deleteAccount(userId: string): Promise<void>;

  /**
   * Generate service token
   */
  generateServiceToken(serviceTokenDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse>;

  /**
   * Validate token
   */
  validateToken(token: string): Promise<Jwtpayload | null>;

  /**
   * Authenticate or create a user via Google OAuth
   */
  validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<TokenResponse>;
}

/**
 * Interface for the core authentication service
 */
export interface IAuthService {
  /**
   * Validate a user's credentials
   */
  validateUser(email: string, password: string): Promise<User | null>;

  /**
   * Login a user and return tokens
   */
  login(user: User): Promise<LoginResultDto>;

  /**
   * Register a new user
   */
  register(name: string, email: string, password: string): Promise<RegistrationResultDto>;

  /**
   * Generate a JWT token for a service-to-service authentication
   */
  generateServiceToken(serviceName: string): string;

  /**
   * Refresh an expired access token using a refresh token
   */
  refreshTokens(refreshToken: string): Promise<TokensResponseDto>;

  /**
   * Logout a user by revoking all their refresh tokens
   */
  logout(userId: string): Promise<void>;

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): PayloadDto | null;

  /**
   * Get a user's profile
   */
  getUserProfile(userId: string): Promise<Partial<User>>;
}

/**
 * Interface for the cached authentication service
 */
export interface ICachedAuthService {
  /**
   * Validate a user's credentials with caching
   */
  validateUser(email: string, password: string): Promise<User | null>;

  /**
   * Login a user by credentials
   */
  login(loginDto: LoginDto): Promise<LoginResultDto>;

  /**
   * Login a user with an already validated user object
   */
  loginWithUser(user: User): Promise<LoginResultDto>;

  /**
   * Register a new user with cache invalidation
   */
  register(registerDto: RegisterDto): Promise<{ message: string }>;

  /**
   * Generate a JWT token for a service-to-service authentication
   */
  generateServiceToken(serviceDto: {
    serviceId: string;
    serviceName: string;
    permissions: string[];
    apiKey: string;
  }): Promise<ServiceTokenResponse>;

  /**
   * Refresh tokens using a valid refresh token
   */
  refreshTokens(refreshToken: string): Promise<TokensResponseDto>;

  /**
   * Alias for refreshTokens to match AuthFacade API
   */
  refreshAccessToken(refreshToken: string): Promise<TokensResponseDto>;

  /**
   * Logout a user by revoking all refresh tokens
   */
  logout(userId: string, refreshToken?: string, accessToken?: string): Promise<{ message: string }>;

  /**
   * Verify if a token is valid with caching
   */
  verifyToken(token: string): Promise<PayloadDto | null>;

  /**
   * Get the full profile of a user with caching
   */
  getUserProfile(userId: string): Promise<Partial<User>>;

  /**
   * Alias for getUserProfile to match AuthFacade API
   */
  getUserById(userId: string): Promise<Partial<User>>;

  /**
   * Password reset request functionality
   */
  forgotPassword(email: string): Promise<{ message: string }>;

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<{ message: string }>;

  /**
   * Verify email address
   */
  verifyEmail(token: string): Promise<boolean>;

  /**
   * Resend verification email
   */
  resendVerificationEmail(userId: string): Promise<{ message: string; email: string }>;

  /**
   * Invalidate all cached user data
   */
  invalidateUserCache(userId: string): Promise<void>;

  /**
   * Update the user profile in cache
   */
  updateCachedUserProfile(userId: string, profile: User): Promise<void>;

  /**
   * Get active sessions for a user with caching
   */
  getActiveSessions(userId: string): Promise<RefreshToken[]>;

  /**
   * Revoke a specific session (logout from a device)
   */
  revokeSession(user: Jwtpayload, sessionId: string): Promise<{ message: string }>;

  /**
   * Update a user's profile
   */
  updateProfile(
    userId: string,
    updateData: Partial<{ firstName?: string; lastName?: string }>,
  ): Promise<{ message: string }>;

  /**
   * Delete a user account
   */
  deleteAccount(userId: string): Promise<void>;

  /**
   * Update a user's password
   */
  updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }>;
} 