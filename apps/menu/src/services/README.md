# Services Directory

This directory contains service classes that handle the business logic of the application.

## Services

- **MenuService**: Handles operations related to menus
- **CategoryService**: Handles operations related to categories
- **MenuItemService**: Handles operations related to menu items

## Architecture

Services in this directory follow these patterns:

1. They extend the BaseService from @app/common for common functionality
2. They use dependency injection to access repositories and other required services
3. They handle error cases consistently using try/catch blocks and return statements
4. They map domain entities to DTOs before sending responses
5. They follow a consistent pattern of validation -> business logic -> mapping

## Error Handling

All service methods use proper error handling with:

```typescript
try {
  // Business logic
} catch (error) {
  return this.handleError(error, 'Error message', [KnownErrorType]);
}
```

## Validation

Services should validate inputs using inherited methods from BaseService:

- `validateObjectId(id: string)`: Ensures a valid MongoDB ObjectId
- `validatePagination(page, limit, maxLimit)`: Normalizes pagination parameters

## Services vs Domain Services

- **Services (this directory)**: Handle HTTP requests, data validation, and orchestration
- **Domain Services** (in domain/services): Contain core business logic and domain rules 