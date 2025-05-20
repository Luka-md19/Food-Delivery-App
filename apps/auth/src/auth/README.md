# Authentication Module

This module provides a robust, well-structured authentication system for the application. It follows SOLID principles and implements various design patterns to create maintainable, testable code.

## Architecture

The authentication system is structured using the following patterns:

1. **Facade Pattern**: `AuthFacade` provides a simplified interface to the complex authentication subsystem.
2. **Single Responsibility Principle**: Each service has a clear, focused responsibility.
3. **Dependency Injection**: Services are loosely coupled through dependency injection.
4. **Strategy Pattern**: Different authentication strategies (password, Google, service tokens) are encapsulated in specialized services.

## Components

### AuthFacade

The main entry point for authentication operations. It delegates to specialized services while providing a unified API.

```typescript
import { AuthFacade } from './auth.facade';
```

### AuthenticationService

Handles core authentication functionality including:
- User registration
- Login with password
- Password recovery/reset
- Email verification
- Token management

```typescript
import { AuthenticationService } from './authentication.service';
```

### SocialAuthService

Manages authentication through third-party providers:
- Google OAuth integration
- Account linking
- Social profile data handling

```typescript
import { SocialAuthService } from './social-auth.service';
```

### ServiceAuthService

Responsible for service-to-service authentication:
- API key validation
- Service token generation
- Permission management for microservices

```typescript
import { ServiceAuthService } from './service-auth.service';
```

## Usage Examples

### User Registration

```typescript
const result = await this.authFacade.register({
  email: 'user@example.com',
  password: 'securePassword123',
  confirmPassword: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe'
});
```

### User Login

```typescript
const tokens = await this.authFacade.login({
  email: 'user@example.com',
  password: 'securePassword123',
  deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
});
```

### Password Reset

```typescript
// Request reset
await this.authFacade.forgotPassword('user@example.com');

// Complete reset
await this.authFacade.resetPassword(token, 'newSecurePassword123');
```

### Google Authentication

```typescript
const tokens = await this.socialAuthService.validateGoogleUser({
  googleId: '115366585632454821870',
  email: 'user@gmail.com',
  firstName: 'John',
  lastName: 'Doe'
});
```

### Service Token Generation

```typescript
const serviceToken = await this.serviceAuthService.generateServiceToken({
  serviceId: 'menu-service-123',
  serviceName: 'menu-service',
  permissions: ['user:read', 'menu:write'],
  apiKey: 'service_api_key_12345'
});
```

## Error Handling

The authentication system uses a standardized error code system through the `ErrorCode` enum from the common module. All error responses include:

- A descriptive message
- An error code for programmatic handling
- Optional metadata for specific error types

Example error response:
```json
{
  "message": "Account locked until 2023-08-31T15:45:30. Too many failed login attempts.",
  "errorCode": "ACCOUNT_LOCKED",
  "metadata": {
    "lockUntil": "2023-08-31T15:45:30"
  }
}
``` 