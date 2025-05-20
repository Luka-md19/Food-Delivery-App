# Messaging Module

This module provides a robust messaging infrastructure for microservices communication with features like circuit breaker, retry mechanisms, and failed message persistence.

## Features

- **Circuit Breaker Pattern**: Prevents cascading failures by automatically stopping requests when a threshold of failures is reached
- **Retry Mechanism**: Implements exponential backoff retries for failed message publishing
- **Dead Letter Handling**: Stores failed messages for later retry via database or file system
- **Health Monitoring**: Tracks connection status and automatically reopens circuits when conditions improve
- **Metrics Tracking**: Collects metrics on successful and failed publishes, circuit breaks, and storage operations

## Usage

### Module Registration

```typescript
// In your module file
import { MessagingModule } from '@app/common';

@Module({
  imports: [
    MessagingModule.forRoot({
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
      successThreshold: 5
    })
  ]
})
export class YourModule {}
```

### Publishing Events

```typescript
// In your service or event handler
import { Injectable } from '@nestjs/common';
import { IEventPublisher } from '@app/common';

@Injectable()
export class YourService {
  constructor(private readonly eventPublisher: IEventPublisher) {}

  async publishEvent(data: any): Promise<void> {
    await this.eventPublisher.publish('your.event.pattern', data);
  }
}
```

## Configuration Options

| Option             | Description                                      | Default |
|--------------------|--------------------------------------------------|---------|
| maxRetries         | Maximum number of retry attempts                 | 3       |
| retryDelay         | Base delay between retries (in ms)               | 1000    |
| failureThreshold   | Number of failures before opening circuit        | 5       |
| resetTimeout       | Time before testing circuit again (in ms)        | 30000   |
| halfOpenRequests   | Number of test requests allowed when half-open   | 3       |
| successThreshold   | Successes required to close circuit              | 5       |
| connectionCheckDelay| Time between connection checks (in ms)          | 5000    |

## Circuit States

The circuit breaker has three states:

1. **CLOSED**: Normal operation, all requests are processed
2. **OPEN**: Circuit is broken, all requests are immediately stored for later retry
3. **HALF_OPEN**: Testing state, limited requests allowed to check if service has recovered

## Failed Message Storage

Failed messages can be stored in two ways:

1. **Database**: Primary storage via `IFailedMessageRepository`
2. **File System**: Fallback storage via `IFileStorageService`

To use these storage options, provide implementations of the respective interfaces in your module's providers. 