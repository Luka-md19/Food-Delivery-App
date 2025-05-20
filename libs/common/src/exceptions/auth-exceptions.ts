import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './auth-exceptions.filter';

/**
 * Base class for all Auth exceptions
 * This ensures consistent error structure and adds error code
 */
export class AuthException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly code: ErrorCode
  ) {
    super({ message, code }, statusCode);
  }
}

/**
 * Exception thrown when user credentials are invalid
 */
export class InvalidCredentialsException extends AuthException {
  constructor(message = 'Invalid email or password') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS);
  }
}

/**
 * Exception thrown when a token is expired
 */
export class TokenExpiredException extends AuthException {
  constructor(message = 'Token has expired') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED);
  }
}

/**
 * Exception thrown when a token is invalid
 */
export class InvalidTokenException extends AuthException {
  constructor(message = 'Invalid token') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_INVALID);
  }
}

/**
 * Exception thrown when a token is blacklisted
 */
export class BlacklistedTokenException extends AuthException {
  constructor(message = 'Token has been revoked') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_BLACKLISTED);
  }
}

/**
 * Exception thrown when a refresh token is invalid
 */
export class InvalidRefreshTokenException extends AuthException {
  constructor(message = 'Invalid refresh token') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.REFRESH_TOKEN_INVALID);
  }
}

/**
 * Exception thrown when a user account is locked
 */
export class AccountLockedException extends AuthException {
  constructor(message = 'Account is locked due to too many failed login attempts') {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_LOCKED);
  }
}

/**
 * Exception thrown when a user account is disabled
 */
export class AccountDisabledException extends AuthException {
  constructor(message = 'Account has been disabled') {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_DISABLED);
  }
}

/**
 * Exception thrown when a user's email is not verified
 */
export class EmailNotVerifiedException extends AuthException {
  constructor(message = 'Email address has not been verified') {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED);
  }
}

/**
 * Exception thrown when a user doesn't exist
 */
export class UserNotFoundException extends AuthException {
  constructor(message = 'User not found') {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
  }
}

/**
 * Exception thrown when an email already exists during registration
 */
export class EmailAlreadyExistsException extends AuthException {
  constructor(message = 'Email address is already in use') {
    super(message, HttpStatus.CONFLICT, ErrorCode.EMAIL_ALREADY_EXISTS);
  }
}

/**
 * Exception thrown when a password reset token is invalid
 */
export class InvalidResetTokenException extends AuthException {
  constructor(message = 'Invalid password reset token') {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.INVALID_RESET_TOKEN);
  }
}

/**
 * Exception thrown when a password reset token has expired
 */
export class ResetTokenExpiredException extends AuthException {
  constructor(message = 'Password reset token has expired') {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.RESET_TOKEN_EXPIRED);
  }
}

/**
 * Exception thrown when passwords don't match
 */
export class PasswordMismatchException extends AuthException {
  constructor(message = 'Passwords do not match') {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.PASSWORD_MISMATCH);
  }
} 