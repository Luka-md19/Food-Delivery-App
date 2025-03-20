# Error Handling Migration Guide

This guide explains how to migrate from the deprecated `BaseService` to the new error handling services.

## Why Migrate?

The `BaseService` class has been deprecated in favor of more specialized services that follow the Single Responsibility Principle. The new services provide:

- Better separation of concerns
- More consistent error handling across microservices
- More detailed validation rules
- Improved logging capabilities

## Migration Steps

### Step 1: Import the ErrorsModule

In your module file (e.g., `your-feature.module.ts`), import the `ErrorsModule`:

```typescript
import { ErrorsModule } from '@app/common/exceptions';

@Module({
  imports: [
    // Other imports
    ErrorsModule,
  ],
  // Rest of your module definition
})
export class YourFeatureModule {}
```

### Step 2: Update Your Services

Replace your `BaseService` extension with proper service injection:

#### Before:

```typescript
import { BaseService } from '@app/common';

@Injectable()
export class YourService extends BaseService {
  constructor() {
    super(YourService.name);
  }

  async someMethod(id: string) {
    try {
      this.validateObjectId(id);
      // Business logic
    } catch (error) {
      return this.handleError(error, 'Failed to process', [NotFoundException]);
    }
  }
}
```

#### After:

```typescript
import { Injectable } from '@nestjs/common';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';

@Injectable()
export class YourService {
  private readonly errorHandler: ErrorHandlerService;
  
  constructor(
    private readonly validator: ValidatorService
  ) {
    // Initialize ErrorHandlerService with the service name
    this.errorHandler = new ErrorHandlerService(YourService.name);
  }

  async someMethod(id: string) {
    try {
      this.validator.validateObjectId(id);
      // Business logic
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to process', [NotFoundException]);
    }
  }
}
```

### Step 3: Replace Validation Methods

Replace the old validation methods with their counterparts:

| Old Method | New Method |
|------------|------------|
| `this.validateObjectId(id)` | `this.validator.validateObjectId(id)` |
| `this.validatePagination(page, limit)` | `this.validator.validatePagination(page, limit)` |
| `this.handleError(error, message)` | `this.errorHandler.handleError(error, message)` |

### Step 4: Use New Logging Methods

Take advantage of the improved logging methods:

```typescript
// Log an informational message
this.errorHandler.logInfo('Processing data');

// Log a warning
this.errorHandler.logWarning('Something might be wrong', optionalErrorObject);

// Log a debug message
this.errorHandler.logDebug('Detailed information', { someData: 'value' });
```

### Step 5: Update Repositories (if applicable)

If you have custom repositories extending `BaseRepository`, update them to use the `ValidatorService`:

```typescript
import { ValidatorService } from '@app/common/exceptions';

export class YourRepository extends BaseRepository {
  constructor() {
    super(mongoDBService, 'yourCollection', 'YourRepository');
  }

  // The BaseRepository now uses ValidatorService internally
}
```

## Available Methods

### ErrorHandlerService

- `handleError<T>(error: any, message: string, knownErrorTypes: any[] = []): T`
- `logWarning(message: string, error?: any): void`
- `logInfo(message: string): void`
- `logDebug(message: string, data?: any): void`

### ValidatorService

- `validateObjectId(id: string): void`
- `validatePagination(page = 1, limit = 10, maxLimit = 100): { page: number, limit: number }`
- `validateNotEmpty(value: any, fieldName: string): void`
- `validateRange(value: number, min: number, max: number, fieldName: string): void` 