# Auth Service Common Utilities

This directory contains common utilities used throughout the Auth service that are specific to authentication, extending the functionality provided by the common library.

## Services Overview

### AuthErrorHandlerService

The `AuthErrorHandlerService` extends the common library's `ErrorHandlerService` to provide specialized error handling for authentication scenarios. This includes:

- Login error handling
- Token validation errors
- Refresh token errors
- Password reset errors

This service demonstrates how to properly extend common library functionality while adding domain-specific behavior.

### AuthJwtService

The `AuthJwtService` is a wrapper around the common library's `JwtService` that provides:
- Service token generation
- API key validation
- Auth-specific JWT functionality

Unlike our original approach, this service now properly uses composition rather than inheritance to avoid TypeScript errors related to private properties in the base class.

## Migration Guide

### Removing Duplication

If you're working with existing code that uses the old error handlers or JWT services directly, follow these steps:

1. Update imports to use the new services:
   ```typescript
   // Before
   import { AuthErrorHandler } from '../common/error-handler.service';
   import { DirectJwtService } from '../common/direct-jwt.service';

   // After
   import { AuthErrorHandlerService } from '../common/auth-error-handler.service';
   import { AuthJwtService } from '../common/auth-jwt.service';
   ```

2. Update dependency injection in services:
   ```typescript
   // Before
   constructor(private readonly errorHandler: AuthErrorHandler) {}

   // After
   constructor(
     @Inject('AuthErrorHandler') 
     private readonly errorHandler: AuthErrorHandlerService
   ) {}
   ```

3. Use common interfaces where appropriate:
   ```typescript
   // Before - using custom interfaces
   method(): IJwtServiceResponse {
     // Implementation
   }

   // After - use common interfaces where possible
   method(): ServiceTokenResponse {
     // Implementation
   }
   ```

## Design Patterns Used

1. **Composition over Inheritance**: The `AuthJwtService` now uses composition (by injecting the common `JwtService`) rather than inheritance, avoiding clashes with private properties in the base class.

2. **Extension Pattern**: The `AuthErrorHandlerService` uses extension properly by using a different property name for its logger (`authLogger` instead of `logger`) to avoid collisions with the protected property in the base class.

## Benefits of Using Common Library

By leveraging the common library services:

1. **Consistent Error Handling**: All services use the same error handling patterns
2. **Reduced Code Duplication**: Core functionality is maintained in one place
3. **Easier Maintenance**: Updates to core logic only need to be made in one place
4. **Better Testing**: Core functionality can be tested once in the common library
5. **Clearer Architecture**: Service-specific needs are clearly separated from common functionality

## Next Steps for Future Improvements

1. Continue to identify and refactor duplicated code into the common library
2. Add more comprehensive tests for both common and service-specific functionality
3. Document service boundaries and responsibilities more clearly
4. Consider creating proper interfaces for all service-specific extensions 