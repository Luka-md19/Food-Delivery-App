import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ErrorHandlerService } from '@app/common/exceptions/error-handler.service';
import {
  InvalidCredentialsException,
  TokenExpiredException,
  InvalidTokenException,
  BlacklistedTokenException,
  InvalidRefreshTokenException,
  AccountLockedException,
  AccountDisabledException,
  EmailNotVerifiedException,
  UserNotFoundException,
  EmailAlreadyExistsException,
  InvalidResetTokenException,
  ResetTokenExpiredException,
  PasswordMismatchException
} from '@app/common/exceptions/auth-exceptions';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * Auth service-specific error handler that extends the common library error handler
 * Centralizes error handling for authentication and token-related operations
 */
@Injectable()
export class AuthErrorHandlerService extends ErrorHandlerService {
  // Use a different name to avoid collision with the base class logger
  protected readonly authLogger = new Logger(AuthErrorHandlerService.name);

  constructor() {
    super(AuthErrorHandlerService.name);
  }

  /**
   * Handle login errors
   */
  handleLoginError(error: Error, userId?: string): never {
    this.authLogger.warn(`Login error: ${error.message}${userId ? ` for user ${userId}` : ''}`);
    
    if (error.message === 'Invalid credentials') {
      throw new InvalidCredentialsException();
    }
    
    if (error.message.includes('Invalid credentials')) {
      throw new InvalidCredentialsException();
    }
    
    if (error.message === 'Account is locked') {
      throw new AccountLockedException();
    }
    
    if (error.message === 'Account is disabled') {
      throw new AccountDisabledException();
    }
    
    if (error.message === 'Email not verified') {
      throw new EmailNotVerifiedException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Login failed', [
      InvalidCredentialsException,
      AccountLockedException,
      AccountDisabledException,
      EmailNotVerifiedException
    ]);
  }
  
  /**
   * Handle token validation errors
   */
  handleTokenError(error: Error): never {
    this.authLogger.warn(`Token error: ${error.message}`);
    
    if (error instanceof TokenExpiredError) {
      throw new TokenExpiredException();
    }
    
    if (error instanceof JsonWebTokenError) {
      throw new InvalidTokenException();
    }
    
    if (error.message === 'Token is blacklisted') {
      throw new BlacklistedTokenException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Token validation failed', [
      TokenExpiredException,
      InvalidTokenException,
      BlacklistedTokenException
    ]);
  }
  
  /**
   * Handle refresh token errors
   */
  handleRefreshTokenError(error: Error): never {
    this.authLogger.warn(`Refresh token error: ${error.message}`);
    
    if (error.message === 'Invalid refresh token') {
      throw new InvalidRefreshTokenException();
    }
    
    if (error instanceof TokenExpiredError || error.message === 'Refresh token expired') {
      throw new TokenExpiredException('Refresh token has expired');
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Refresh token validation failed', [
      InvalidRefreshTokenException,
      TokenExpiredException
    ]);
  }
  
  /**
   * Alias for handleRefreshTokenError for backward compatibility
   */
  handleTokenRefreshError(error: Error): never {
    return this.handleRefreshTokenError(error);
  }
  
  /**
   * Handle password reset errors
   */
  handleResetPasswordError(error: Error): never {
    this.authLogger.warn(`Reset password error: ${error.message}`);
    
    if (error.message === 'Invalid reset token') {
      throw new InvalidResetTokenException();
    }
    
    if (error.message === 'Reset token expired') {
      throw new ResetTokenExpiredException();
    }
    
    if (error.message === 'Passwords do not match') {
      throw new PasswordMismatchException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Password reset failed', [
      InvalidResetTokenException,
      ResetTokenExpiredException,
      PasswordMismatchException
    ]);
  }

  /**
   * Handle registration errors
   */
  handleRegistrationError(error: Error): never {
    this.authLogger.warn(`Registration error: ${error.message}`);
    
    if (error instanceof QueryFailedError) {
      const pgError = error as any;
      if (pgError.code === '23505' && pgError.detail?.includes('email')) {
        throw new EmailAlreadyExistsException();
      }
    }
    
    if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
      throw new EmailAlreadyExistsException();
    }
    
    if (error.message === 'Passwords do not match') {
      throw new PasswordMismatchException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Registration failed', [
      EmailAlreadyExistsException,
      PasswordMismatchException
    ]);
  }

  /**
   * Handle password change errors
   */
  handlePasswordChangeError(error: Error): never {
    this.authLogger.warn(`Password change error: ${error.message}`);
    
    if (error.message === 'Passwords do not match') {
      throw new PasswordMismatchException();
    }
    
    if (error.message === 'Current password is incorrect') {
      throw new InvalidCredentialsException('Current password is incorrect');
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Password change failed', [
      PasswordMismatchException,
      InvalidCredentialsException
    ]);
  }

  /**
   * Handle profile update errors
   */
  handleProfileUpdateError(error: Error): never {
    this.authLogger.warn(`Profile update error: ${error.message}`);
    
    if (error instanceof EntityNotFoundError || error.message.includes('User not found')) {
      throw new UserNotFoundException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Profile update failed', [
      UserNotFoundException
    ]);
  }

  /**
   * Handle email verification resend errors
   */
  handleResendVerificationError(error: Error): never {
    this.authLogger.warn(`Resend verification error: ${error.message}`);
    
    if (error.message.includes('already verified')) {
      throw new InvalidTokenException('Email already verified');
    }
    
    if (error.message.includes('User not found')) {
      throw new UserNotFoundException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'Resend verification failed', [
      InvalidTokenException,
      UserNotFoundException
    ]);
  }

  /**
   * Handle user lookup errors
   */
  handleUserError(error: Error): never {
    this.authLogger.warn(`User error: ${error.message}`);
    
    if (error instanceof EntityNotFoundError || error.message.includes('User not found')) {
      throw new UserNotFoundException();
    }
    
    // Use the common library's error handling for unexpected errors
    return this.handleError(error, 'User operation failed', [
      UserNotFoundException
    ]);
  }

  /**
   * Handle not found errors with a specific entity name
   */
  handleNotFoundError(error: Error, entityName: string): never {
    this.authLogger.warn(`Not found error (${entityName}): ${error.message}`);
    
    throw new NotFoundException(`${entityName} not found`);
  }

  /**
   * Handle permission errors
   */
  handleForbiddenError(error: Error): never {
    this.authLogger.warn(`Permission error: ${error.message}`);
    
    throw new ForbiddenException(error.message || 'Insufficient permissions for this operation');
  }

  /**
   * Unified unexpected error handler for consistent error responses
   */
  handleUnexpectedError<T>(error: Error, context: string): T {
    this.authLogger.error(`Unexpected error in ${context}: ${error.message}`, error.stack);
    
    if (error instanceof NotFoundException) {
      throw error;
    }
    
    if (error instanceof ForbiddenException) {
      throw error;
    }
    
    if (
      error instanceof InvalidCredentialsException ||
      error instanceof TokenExpiredException ||
      error instanceof InvalidTokenException ||
      error instanceof BlacklistedTokenException ||
      error instanceof InvalidRefreshTokenException ||
      error instanceof AccountLockedException ||
      error instanceof AccountDisabledException ||
      error instanceof EmailNotVerifiedException ||
      error instanceof UserNotFoundException ||
      error instanceof EmailAlreadyExistsException ||
      error instanceof InvalidResetTokenException ||
      error instanceof ResetTokenExpiredException ||
      error instanceof PasswordMismatchException
    ) {
      throw error;
    }
    
    // For TypeORM errors, convert to NestJS exceptions
    if (error instanceof QueryFailedError) {
      if (error.message.includes('duplicate key')) {
        throw new EmailAlreadyExistsException('A record with this value already exists');
      }
      
      if (error.message.includes('foreign key constraint')) {
        throw new NotFoundException('Related record not found');
      }
    }
    
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException('Record not found');
    }
    
    throw new InternalServerErrorException(`An error occurred during ${context}: ${error.message}`);
  }
} 