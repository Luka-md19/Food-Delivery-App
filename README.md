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

The application includes a flexible dynamic rate limiting solution to protect APIs from abuse and ensure fair usage.

### Features

- **Centralized Configuration**: All rate limits defined in a single configuration file
- **Dynamic Rate Limits**: Different limits for various services and endpoints
- **Multiple Storage Options**: In-memory and Redis storage
- **Easy-to-use Decorators**: Simple application of rate limits to controllers and routes

### Usage

Apply rate limiting to a controller or route using decorators:

```typescript
// Dynamic rate limiting
@DynamicRateLimit('AUTH', 'login')         // Uses predefined limits from configuration
@DynamicRateLimit('MENU', 'createItem')    // Service and endpoint specific limits

// Skip rate limiting
@SkipRateLimit()
```

The rate limits are defined in the constants file and can be adjusted without changing code:

```typescript
export const RATE_LIMIT_CONFIGS = {
  AUTH: {
    login: { ttl: 60, limit: 3 },          // 3 login attempts per minute
    deleteAccount: { ttl: 300, limit: 1 }, // 1 account deletion per 5 minutes
    // ... other endpoints
  },
  MENU: {
    createItem: { ttl: 60, limit: 10 },    // 10 item creations per minute
    // ... other endpoints
  }
};
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

## Service-to-Service Authentication

The application now includes a robust service-to-service authentication system that provides:

- **Service Identity**: Each service has a unique identity with specific permissions
- **Secure Authentication**: Services authenticate with each other using JWT tokens
- **Permission Controls**: Granular control over what each service can do
- **Automated Token Refresh**: Tokens are automatically refreshed before expiration

### Security Best Practices

For security reasons, sensitive credentials should NEVER be hardcoded in your application:

1. **Environment Variables**: Store all sensitive information as environment variables
2. **Secret Management**: For production, use a secret management solution like HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets
3. **Key Rotation**: Implement regular key rotation for all secrets
4. **Principle of Least Privilege**: Each service should only have the permissions it absolutely needs

### Configuration

1. Copy the `.env.example` file to create a `.env` file:
```bash
cp .env.example .env
```

2. For each service, create a `.env.local` file with sensitive information:
```bash
cp apps/auth/.env.example apps/auth/.env.local
cp apps/menu/.env.example apps/menu/.env.local
```

3. Update all environment files with secure values. Each service requires the following environment variables:

**Auth Service**:
```
# JWT Security Configuration
JWT_SECRET=your_secure_jwt_secret_key
JWT_PRIVATE_KEY=your_secure_private_key
DIRECT_JWT_SECRET=your_secure_direct_jwt_key
SERVICE_TOKEN_EXPIRATION=1h

# Service API Keys - Format: "serviceId1:key1,serviceId2:key2"
SERVICE_API_KEYS=menu-service:your_secure_api_key,order-service:your_secure_api_key
```

**Menu Service**:
```
SERVICE_NAME=menu-service
SERVICE_ID=550e8400-e29b-41d4-a716-446655440000
SERVICE_PERMISSIONS=auth.read,user.read,menu.write,menu.read
AUTH_SERVICE_URL=http://auth:3000
JWT_SECRET=your_secure_jwt_secret_key
```

### Usage

To protect a microservice endpoint with service authentication:

```typescript
@MessagePattern({ cmd: 'some_command' })
@UseGuards(MicroserviceAuthGuard)
@ServicePermissions('required.permission')
async someMethod(@Payload() data: any) {
  // This will only execute if the calling service has the required permission
  return this.someService.doSomething(data);
}
```

## Security Considerations

### Data Protection
- All sensitive information (passwords, API keys, etc.) should be stored securely using environment variables
- Never commit `.env` files containing real credentials to version control
- Add `.env`, `.env.local`, and other similar files to your `.gitignore`

### HTTPS
- Always use HTTPS in production environments
- Configure proper SSL certificates for all public-facing services

### JWT Security
- Use strong, random secrets for JWT signing
- Implement short expiration times for tokens
- Use private/public key pairs for enhanced security

### Rate Limiting and Monitoring
- Implement rate limiting on all public endpoints
- Set up monitoring and alerting for unusual access patterns
- Use logging best practices to track security events

## Quick Start

To start all services with a single command:

```bash
# Make the script executable
chmod +x start-services.sh

# Run it
./start-services.sh
```

This will start all services and display URLs for service endpoints and admin panels.

## Environment Configuration

To properly set up the environment variables for each service:

1. Check the comprehensive documentation in the `docs/config/` directory:
   - `environment-variables.md` - Lists all available environment variables
   - `environment-setup.md` - Explains the configuration system
   - `creating-env-files.md` - Step-by-step guide to create .env files

2. Create service-specific `.env` files in each service directory:
   - `apps/auth/.env` - For authentication service
   - `apps/menu/.env` - For menu service
   - `apps/order/.env` - For order service
   
3. Access the configuration in your code through the AppConfigService:
   ```typescript
   constructor(private readonly configService: AppConfigService) {
     const dbUri = this.configService.get('MONGODB_URI');
   }
   ```

> Note: Environment files (.env) are not included in the repository for security reasons. Use the example files and documentation to create your own.
