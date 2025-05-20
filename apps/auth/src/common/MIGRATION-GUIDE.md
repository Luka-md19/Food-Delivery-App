# Migration Guide for Auth Service

This guide outlines the steps to migrate from the old error handler and JWT services to the new ones that properly leverage the common library.

## Step 1: Update Import Statements

### Error Handler

Replace imports of the old `AuthErrorHandler` with the new `AuthErrorHandlerService`:

```typescript
// Before
import { AuthErrorHandler } from '../common/error-handler.service';

// After
import { AuthErrorHandlerService } from '../common/auth-error-handler.service';
```

### JWT Service

Replace imports of the old `DirectJwtService` with the new `AuthJwtService`:

```typescript
// Before
import { DirectJwtService } from '../common/direct-jwt.service';

// After
import { AuthJwtService } from '../common/auth-jwt.service';
```

## Step 2: Update Dependency Injection

### Error Handler

Update constructor injection to use the new service with the proper injection token:

```typescript
// Before
constructor(
  private readonly errorHandler: AuthErrorHandler,
) {}

// After
constructor(
  @Inject('AuthErrorHandler')
  private readonly errorHandler: AuthErrorHandlerService,
) {}
```

### JWT Service

Update constructor injection to use the new service with the proper injection token:

```typescript
// Before
constructor(
  private readonly jwtService: DirectJwtService,
) {}

// After
constructor(
  @Inject('AuthJwtService')
  private readonly jwtService: AuthJwtService,
) {}
```

## Step 3: Update ServiceTokenDto

If you were using the `ServiceTokenRequestDto` interface, switch to `ServiceTokenDto` instead:

```typescript
// Before
import { ServiceTokenRequestDto } from '../dto/service-token.dto';
function generateToken(request: ServiceTokenRequestDto) { /* ... */ }

// After
import { ServiceTokenDto } from '../dto/service-token.dto';
function generateToken(request: ServiceTokenDto) { /* ... */ }
```

## Step 4: Update Response Types

If you were using the `IJwtServiceResponse` interface, switch to `ServiceTokenResponse` from the common library:

```typescript
// Before
import { IJwtServiceResponse } from '../common/direct-jwt.service';
function getToken(): IJwtServiceResponse { /* ... */ }

// After
import { ServiceTokenResponse } from '@app/common/auth/interfaces';
function getToken(): ServiceTokenResponse { /* ... */ }
```

## Files to Update

Here are the files that need to be updated:

1. `apps/auth/src/auth/services/authentication.service.ts`
2. `apps/auth/src/users/users.service.ts`
3. `apps/auth/src/token/token.module.ts`
4. `apps/auth/src/users/users.module.ts`
5. `apps/auth/src/token/services/token-consumer.service.ts`
6. `apps/auth/src/token/services/token-manager.service.ts`
7. `apps/auth/src/token/services/token-cleanup.service.ts`
8. `apps/auth/src/token/services/session.service.ts`
9. Any additional services that inject these dependencies

## Docker Build Considerations

Before running `docker compose up build`, ensure that:

1. All import statements have been updated
2. All constructor injections use the correct service and injection token
3. All modules provide and export the new services with their injection tokens

If you encounter build errors, check for any missing imports or dependency injection issues first. 