# Filters Directory

This directory contains exception filters for handling errors in the application.

## Filters

- **AllExceptionsFilter**: Catches and formats all uncaught exceptions

## Purpose

Exception filters in NestJS serve these purposes:

1. Catch exceptions thrown during request processing
2. Format error responses in a consistent way
3. Log exceptions for monitoring and debugging
4. Provide appropriate HTTP status codes
5. Hide sensitive information in production

## Implementation

The exception filters follow these patterns:

1. Implement the `ExceptionFilter` interface
2. Use the `@Catch()` decorator to specify which exceptions to catch
3. Format error responses based on the exception type
4. Include relevant information for debugging and client handling

## Best Practices

1. Format error responses consistently
2. Include appropriate status codes
3. Provide helpful error messages without exposing sensitive details
4. Log exceptions with proper context
5. Return machine-readable error codes for client processing

## Example

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = 
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';
    
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception.stack
    );
    
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
``` 