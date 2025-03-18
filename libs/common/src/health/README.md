# Common Health Module

This module provides a standardized way to implement health checks across all microservices in the application.

## Features

- Consistent health check implementation across all services
- Automatic detection and checking of dependencies (RabbitMQ, MongoDB, PostgreSQL, Redis)
- Standardized health check response format
- Easy to extend for service-specific health checks

## Usage

### 1. Import the HealthModule in your service module

```typescript
import { Module } from '@nestjs/common';
import { HealthModule } from '@app/common/health';

@Module({
  imports: [
    // ... other imports
    HealthModule.register({ serviceName: 'your-service-name' }),
  ],
  // ... controllers, providers, etc.
})
export class YourServiceModule {}
```

### 2. Create a service-specific health controller

```typescript
import { Controller, Inject } from '@nestjs/common';
import { HealthController, HealthCheckService } from '@app/common/health';

@Controller('your-path/health')
export class YourServiceHealthController extends HealthController {
  constructor(
    protected readonly healthCheckService: HealthCheckService,
    @Inject('SERVICE_NAME') protected readonly serviceName: string
  ) {
    super(healthCheckService, serviceName);
  }
}
```

### 3. Add the controller to your module

```typescript
@Module({
  imports: [
    // ... other imports
    HealthModule.register({ serviceName: 'your-service-name' }),
  ],
  controllers: [
    // ... other controllers
    YourServiceHealthController,
  ],
  // ... providers, etc.
})
export class YourServiceModule {}
```

### 4. Update your Docker health check

In your `docker-compose.yml` file, update the health check for your service:

```yaml
services:
  your-service:
    # ... other configuration
    healthcheck:
      test: curl -f http://localhost:3000/your-path/health || exit 1
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## Health Check Response Format

The health check endpoint returns a JSON response with the following format:

```json
{
  "status": "ok",
  "timestamp": "2023-03-13T19:26:00.000Z",
  "service": "your-service-name",
  "version": "1.0.0",
  "port": 3000,
  "environment": "production",
  "dependencies": {
    "rabbitmq": "connected",
    "database": "connected",
    "redis": "connected"
  }
}
```

The `status` field can have one of the following values:
- `ok`: All dependencies are available
- `degraded`: Some dependencies are unavailable but the service can still function
- `down`: The service cannot function properly

## Extending the Health Check

You can extend the health check to include service-specific checks by overriding the `check` method in your service-specific health controller:

```typescript
@Controller('your-path/health')
export class YourServiceHealthController extends HealthController {
  constructor(
    protected readonly healthCheckService: HealthCheckService,
    @Inject('SERVICE_NAME') protected readonly serviceName: string,
    private readonly yourCustomService: YourCustomService
  ) {
    super(healthCheckService, serviceName);
  }

  @Get()
  async check(): Promise<HealthCheckResult> {
    // Get the base health check result
    const result = await this.healthCheckService.check(this.serviceName);
    
    // Add your custom checks
    result.dependencies.customService = await this.checkCustomService();
    
    // Update the overall status if needed
    if (result.dependencies.customService === 'disconnected') {
      result.status = 'degraded';
    }
    
    return result;
  }

  private async checkCustomService(): Promise<'connected' | 'disconnected'> {
    try {
      await this.yourCustomService.checkConnection();
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }
}
``` 