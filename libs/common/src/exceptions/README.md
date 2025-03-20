# Error Handling

This module provides centralized error handling utilities for microservices in the application.

## Components

### ErrorHandlerService
A service for handling and logging errors consistently across microservices.

### ValidatorService
A service for common validation logic that throws appropriate exceptions.

### ErrorsModule
A module that provides both services and can be imported into your microservice's module.

## Migration from BaseService

If you're currently using the deprecated `BaseService` class, please refer to the [Migration Guide](./MIGRATION_GUIDE.md) for instructions on how to update your code to use these new services.

## Usage

1. Import the `ErrorsModule` in your microservice's module:

```typescript
import { ErrorsModule } from '@app/common/exceptions';

@Module({
  imports: [
    // ... other imports
    ErrorsModule,
  ],
  // ... rest of your module
})
export class YourModule {}
```

2. Inject the services in your service class:

```typescript
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';

@Injectable()
export class YourService {
  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService
  ) {
    // Initialize ErrorHandlerService with the service name
    this.errorHandler = new ErrorHandlerService(YourService.name);
  }
  
  async yourMethod() {
    try {
      // Use validator methods
      this.validator.validateObjectId(id);
      
      // Log information
      this.errorHandler.logInfo('Processing something');
      
      // Your business logic here
      
    } catch (error) {
      // Handle and log errors
      return this.errorHandler.handleError(error, 'Failed to process something', [NotFoundException]);
    }
  }
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