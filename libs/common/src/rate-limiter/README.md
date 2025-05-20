# Rate Limiter Module

A flexible and configurable dynamic rate limiting solution for NestJS applications, designed to protect APIs from abuse and ensure fair usage.

## Features

- **Centralized Configuration**: All rate limits defined in a single configuration file
- **Dynamic Rate Limits**: Different limits for various services and endpoints  
- **Multiple Storage Options**: Support for in-memory and Redis storage
- **Decorators**: Easy-to-use decorators for applying rate limits to controllers and routes
- **Custom Response Handling**: Customizable response format for rate limit errors
- **Header Information**: Includes rate limit information in response headers

## Installation

The rate limiter module is part of the `@app/common` package and is available by default in the application.

## Usage

### Dynamic Rate Limiting

Apply rate limiting to a controller or route using the `@DynamicRateLimit` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { DynamicRateLimit } from '@app/common/rate-limiter';

@Controller('example')
export class ExampleController {
  @Get()
  @DynamicRateLimit('AUTH', 'login')
  login() {
    return 'This endpoint is rate limited';
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
  @Get('profile')
  @SkipRateLimit()
  getProfile() {
    return 'This endpoint has no rate limiting';
  }
}
```

## Configuration

Rate limits are defined in the `constants.ts` file and can be customized for different services and endpoints:

```typescript
export const RATE_LIMIT_CONFIGS = {
  AUTH: {
    login: { ttl: 60, limit: 3 }, // 3 requests per minute
    register: { ttl: 60, limit: 3 }, // 3 requests per minute
    forgotPassword: { ttl: 300, limit: 3 }, // 3 requests per 5 minutes
  },
  MENU: {
    findAll: { ttl: 60, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    create: { ttl: 60, limit: 20 }, // 20 requests per minute (standard for write operation)
    delete: { ttl: 60, limit: 10 }, // 10 requests per minute (stricter for delete operation)
  },
  // ...
};
```

## How It Works

1. Apply the `@DynamicRateLimit` decorator to your controller methods with the service and endpoint names.
2. The `DynamicRateLimiterGuard` intercepts requests to these endpoints.
3. The guard looks up the rate limit configuration based on the service and endpoint names.
4. If too many requests are made, the guard returns a 429 Too Many Requests response.
5. The rate limit state is stored in either memory or Redis.

## Module Registration

Register the ThrottlerModule in your application:

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerStorageType } from '@app/common/rate-limiter';
import { APP_GUARD } from '@nestjs/core';
import { DynamicRateLimiterGuard, DynamicRateLimiterService } from '@app/common/rate-limiter';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // Default TTL in seconds
      limit: 10, // Default request limit
      storageType: ThrottlerStorageType.REDIS, // Use Redis for storage
      errorMessage: 'Too many requests, please try again later', // Custom error message
      excludePaths: ['/api/health'], // Paths to exclude from rate limiting
    }),
  ],
  providers: [
    DynamicRateLimiterService,
    {
      provide: APP_GUARD,
      useClass: DynamicRateLimiterGuard,
    }
  ],
})
export class AppModule {}
```

## Redis Storage

To use Redis for rate limiting storage, ensure Redis is configured in your application and specify the storage type when registering the module:

```typescript
ThrottlerModule.forRoot({
  storageType: ThrottlerStorageType.REDIS,
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