# Menu Microservice

This microservice handles menu-related operations for the food delivery application.

## Features

- Menu CRUD operations
- Category management
- Menu item management
- Event-driven architecture with RabbitMQ
- MongoDB data storage

## Project Structure

```
apps/menu/
├── src/
│   ├── common/            # Common utilities and error handling
│   ├── controllers/       # HTTP controllers
│   ├── domain/            # Domain entities and business logic
│   ├── dto/               # Data Transfer Objects
│   │   ├── menu/          # Menu-related DTOs
│   │   ├── category/      # Category-related DTOs
│   │   ├── menu-item/     # Menu item-related DTOs
│   │   └── common/        # Shared DTOs
│   ├── events/            # Event handling
│   ├── filters/           # Exception filters
│   ├── health/            # Health check endpoints
│   ├── repositories/      # Data access
│   ├── schemas/           # MongoDB schemas
│   ├── services/          # Business logic
│   ├── main.ts            # Application entry point
│   └── menu.module.ts     # Main module
├── test/                  # Tests
├── .env                   # Environment variables
├── Dockerfile             # Docker configuration
└── tsconfig.app.json      # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm
- MongoDB
- RabbitMQ

### Installation

```bash
pnpm install
```

### Configuration

Create a `.env` file based on the provided `.env.example`.

### Running the Service

```bash
# Development
pnpm run start:dev

# Production
pnpm run build:menu
pnpm run start:prod
```

## API Documentation

Swagger documentation is available at `/api/docs` when the service is running.

## Architecture

This service follows a clean architecture approach with:

1. **Controllers**: Handle HTTP requests
2. **Services**: Contain application business logic
3. **Repositories**: Manage data access
4. **Domain**: Contains core business entities and rules
5. **Events**: Manage event-driven communication

## Event-Driven Architecture

The service publishes events for:
- Menu creation/updates/deletion
- Category changes
- Menu item changes

These events can be consumed by other services for cross-service communication.

## Testing

```bash
# Unit tests
pnpm run test

# e2e tests
pnpm run test:e2e
``` 