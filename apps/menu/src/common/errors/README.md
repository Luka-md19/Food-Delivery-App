# Error Handling Module

This module provides standardized error handling for the application.

## Services

### ErrorHandlerService

A service for consistent error handling and logging across the application.

- `handleError<T>(error: any, message: string, knownErrorTypes: any[] = []): T`: Handles errors, logs them properly and throws appropriate exceptions
- `logWarning(message: string, error?: any): void`: Logs warnings
- `logInfo(message: string): void`: Logs informational messages
- `logDebug(message: string, data?: any): void`: Logs debug messages

### ValidatorService

A service for common validation tasks across the application.

- `validateObjectId(id: string): void`: Validates MongoDB ObjectIDs
- `validatePagination(page = 1, limit = 10, maxLimit = 100): { page: number, limit: number }`: Normalizes pagination parameters
- `validateNotEmpty(value: any, fieldName: string): void`: Validates non-empty values
- `validateRange(value: number, min: number, max: number, fieldName: string): void`: Validates numeric ranges

## Usage

```typescript
import { ErrorHandlerService, ValidatorService } from '../common/errors';

@Injectable()
export class SomeService {
  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService
  ) {}

  async findById(id: string): Promise<SomeDto> {
    try {
      this.validator.validateObjectId(id);
      // ... service logic
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to find item', [NotFoundException]);
    }
  }
}
``` 