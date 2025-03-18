# Controllers Directory

This directory contains controller classes that handle HTTP requests for the application.

## Controllers

- **MenuController**: Handles operations related to menus
- **CategoryController**: Handles operations related to categories
- **MenuItemController**: Handles operations related to menu items

## Architecture

Controllers in this directory follow these patterns:

1. They use dependency injection to access services
2. They handle HTTP requests and return appropriate responses
3. They use DTOs for input validation and response formatting
4. They leverage NestJS decorators for routing and request handling
5. They include Swagger documentation for API endpoints

## Request Flow

1. Client makes an HTTP request
2. Controller receives and validates the request
3. Controller delegates business logic to a service
4. Service performs operations and returns data
5. Controller transforms data to appropriate response format

## Best Practices

1. Controllers should be thin - minimal business logic
2. Use proper HTTP methods and status codes
3. Validate inputs using DTO classes with class-validator
4. Document APIs with Swagger annotations
5. Handle errors consistently
6. Return standardized response formats 