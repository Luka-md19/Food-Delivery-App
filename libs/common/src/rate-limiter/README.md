# Rate Limiter Module

A flexible and configurable rate limiting solution for NestJS applications, designed to protect APIs from abuse and ensure fair usage.

## Features

- **Configurable Rate Limits**: Define different rate limits for various services and endpoints
- **Multiple Storage Options**: Support for in-memory and Redis storage
- **Decorators**: Easy-to-use decorators for applying rate limits to controllers and routes
- **Custom Response Handling**: Customizable response format for rate limit errors
- **Header Information**: Includes rate limit information in response headers

## Installation

The rate limiter module is part of the `@app/common` package and is available by default in the application.

## Usage

### Basic Usage

Apply rate limiting to a controller or route using the `@RateLimit` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RateLimit } from '@app/common/rate-limiter';

@Controller('example')
export class ExampleController {
  @Get()
  @RateLimit('SERVICE_NAME', 'endpoint')
  findAll() {
    return 'This endpoint is rate limited';
  }
}
```

### Predefined Rate Limits

Use predefined rate limit configurations for common scenarios:

```typescript
import { Controller, Get } from '@nestjs/common';
import { StandardRateLimit, RelaxedRateLimit, StrictRateLimit } from '@app/common/rate-limiter';

@Controller('example')
export class ExampleController {
  @Get('strict')
  @StrictRateLimit()
  strictEndpoint() {
    return 'This endpoint has strict rate limiting (5 requests per minute)';
  }

  @Get('standard')
  @StandardRateLimit()
  standardEndpoint() {
    return 'This endpoint has standard rate limiting (20 requests per minute)';
  }

  @Get('relaxed')
  @RelaxedRateLimit()
  relaxedEndpoint() {
    return 'This endpoint has relaxed rate limiting (50 requests per minute)';
  }
}
```

### Custom Rate Limits

Apply custom rate limits to specific endpoints:

```typescript
import { Controller, Get } from '@nestjs/common';
import { CustomRateLimit } from '@app/common/rate-limiter';

@Controller('example')
export class ExampleController {
  @Get('custom')
  @CustomRateLimit(100, 60) // 100 requests per 60 seconds
  customEndpoint() {
    return 'This endpoint has a custom rate limit';
  }
}
```

### Skipping Rate Limits

Skip rate limiting for specific endpoints:

```typescript
import { Controller, Get } from '@nestjs/common';
import { SkipRateLimit } from '@app/common/rate-limiter';

@Controller('example')
export class ExampleController {
  @Get('unlimited')
  @SkipRateLimit()
  unlimitedEndpoint() {
    return 'This endpoint has no rate limiting';
  }
}
```

## Configuration

Rate limits are defined in the `constants.ts` file and can be customized for different services and endpoints:

```typescript
export const RATE_LIMIT_CONFIGS = {
  SERVICE_NAME: {
    endpoint1: { ttl: 60, limit: 10 }, // 10 requests per minute
    endpoint2: { ttl: 300, limit: 50 }, // 50 requests per 5 minutes
  },
  // ...
};
```

## Module Registration

Register the ThrottlerModule in your application:

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@app/common/rate-limiter';

@Module({
  imports: [
    ThrottlerModule.register({
      ttl: 60, // Default TTL in seconds
      limit: 10, // Default request limit
      storage: ThrottlerStorageType.REDIS, // Use Redis for storage
      ignoreUserAgents: [/health-check/], // Ignore specific user agents
      errorMessage: 'Rate limit exceeded', // Custom error message
    }),
  ],
})
export class AppModule {}
```

## Redis Storage

To use Redis for rate limiting storage, ensure Redis is configured in your application and specify the storage type when registering the module:

```typescript
ThrottlerModule.register({
  storage: ThrottlerStorageType.REDIS,
  // other options...
})
```

## Headers

The rate limiter adds the following headers to responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current time window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit resets

## Error Response

When a rate limit is exceeded, the module returns a 429 Too Many Requests response with a customizable error message and details about the rate limit. 