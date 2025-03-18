<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Food Delivery Application

A microservices-based food delivery application built with NestJS, MongoDB, PostgreSQL, and RabbitMQ.

## Features

- **Microservices Architecture**: Separate services for authentication, menu management, orders, and more
- **API Gateway**: Unified entry point for all client requests
- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Rate Limiting**: Advanced rate limiting to protect APIs from abuse
- **Health Checks**: Monitoring endpoints for service health
- **Swagger Documentation**: API documentation with OpenAPI
- **Docker Support**: Containerized deployment with Docker Compose

## Project Structure

The application is organized into multiple microservices:

- **Auth Service**: Handles user authentication, registration, and profile management
- **Menu Service**: Manages restaurant menus, categories, and items
- **Order Service**: Processes customer orders and payments
- **Delivery Service**: Manages delivery logistics and tracking
- **Notification Service**: Sends notifications to users
- **Common Library**: Shared code and utilities used across services

## Getting Started

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- pnpm package manager

### Installation

```bash
# Install dependencies
$ pnpm install
```

### Running the Application

```bash
# Development mode with Docker
$ docker compose up

# Development mode without Docker
$ pnpm run start:dev

# Production mode
$ pnpm run start:prod
```

## Rate Limiter Module

The application includes a flexible rate limiting solution to protect APIs from abuse and ensure fair usage.

### Features

- **Configurable Rate Limits**: Different limits for various services and endpoints
- **Multiple Storage Options**: In-memory and Redis storage
- **Easy-to-use Decorators**: Simple application of rate limits to controllers and routes

### Usage

Apply rate limiting to a controller or route using decorators:

```typescript
// Basic rate limiting
@RateLimit('SERVICE_NAME', 'endpoint')

// Predefined rate limits
@StrictRateLimit()    // 5 requests per minute
@StandardRateLimit()  // 20 requests per minute
@RelaxedRateLimit()   // 50 requests per minute

// Custom rate limits
@CustomRateLimit(100, 60)  // 100 requests per 60 seconds

// Skip rate limiting
@SkipRateLimit()
```

For more details, see the [Rate Limiter Documentation](libs/common/src/rate-limiter/README.md).

## Health Checks

The application includes health check endpoints for monitoring service status:

```
GET /api/health
```

Each service implements a health controller that checks the status of its dependencies (database, message broker, etc.).

## API Documentation

Swagger documentation is available at:

```
GET /api/docs
```

## Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov
```

## Deployment

The application can be deployed using Docker Compose:

```bash
# Production deployment
$ docker compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is [MIT licensed](LICENSE).
