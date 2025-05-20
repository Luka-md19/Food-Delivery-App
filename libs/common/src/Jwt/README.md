# JWT Module with Key Rotation

This module extends the NestJS JWT functionality with advanced features like key rotation for enhanced security.

## Features

### Key Rotation

Key rotation is a critical security practice that involves periodically changing the cryptographic keys used to sign JWTs. This limits the damage if a key is compromised by ensuring that tokens are signed with different keys over time. Our implementation:

- Automatically rotates keys based on a configurable schedule
- Maintains multiple valid keys during transition periods
- Embeds key IDs (kid) in token headers for verification
- Gracefully handles verification of tokens signed with both current and previous keys
- Cleans up expired keys according to configurable policy

## Configuration

The JWT key rotation is controlled by the following environment variables:

```
JWT_SECRET=your_super_secret_key_with_at_least_32_chars
JWT_KEY_ROTATION_ENABLED=true
JWT_KEY_ROTATION_INTERVAL_DAYS=30
JWT_MAX_KEY_AGE_DAYS=90
JWT_SECRET_COMPLEXITY_REQUIRED=true
```

### Configuration Options

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `JWT_SECRET` | Base secret used to derive rotation keys | (required) |
| `JWT_KEY_ROTATION_ENABLED` | Enable or disable key rotation | `false` |
| `JWT_KEY_ROTATION_INTERVAL_DAYS` | Days between key rotations | `30` |
| `JWT_MAX_KEY_AGE_DAYS` | Maximum age of keys before deletion | `90` |
| `JWT_SECRET_COMPLEXITY_REQUIRED` | Whether to validate secret complexity | `false` |

## Usage

The enhanced `JwtService` is a drop-in replacement for the NestJS `JwtService` and maintains the same API, so you can use it with your existing code:

```typescript
import { JwtService } from '@app/common/jwt';

@Injectable()
export class MyService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: any): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token);
  }
}
```

## Implementation Details

The service maintains an array of keys, each with:
- A key identifier (kid)
- The secret key
- Creation timestamp
- Primary key flag

When signing a token, the service:
1. Uses only the primary key
2. Includes the key ID in the token header

When verifying a token, the service:
1. Extracts the key ID from the token header
2. Finds the corresponding key
3. Verifies using that specific key
4. Falls back to trying all keys if the specific key is not found

This allows for a seamless transition during key rotation periods, where tokens signed with old keys remain valid until they expire naturally.

## Security Benefits

- **Limited Key Exposure**: Regular key rotation limits how long a compromised key can be exploited
- **Key Identification**: Including key IDs allows for targeted key revocation
- **Graceful Rotation**: No service disruption during key changes
- **Self-cleaning**: Automatic removal of expired keys reduces security risks 