# Environment Configuration Guide

This project uses a hierarchical approach to environment variable configuration to ensure consistency, avoid duplication, and maintain security across multiple microservices.

## Structure

The environment variables are loaded in the following order (with later files overriding earlier ones):

1. `.env` - Root-level shared configuration
2. `.env.{NODE_ENV}` - Environment-specific configuration (development, production, etc.)
3. `apps/{service}/.env` - Service-specific configuration

## What Goes Where

### Root `.env` (Shared)

This file should contain:
- Shared security keys (JWT secrets)
- Shared infrastructure settings (Redis, RabbitMQ)
- Port configuration for all services
- Docker configuration settings
- Other shared settings used by multiple services

Example:
```
# Core shared settings
NODE_ENV=development
LOG_LEVEL=debug

# Shared JWT configuration
JWT_SECRET=shared-secret-used-by-all-services
```

### Environment-specific `.env.{NODE_ENV}`

These files contain environment-specific overrides:
- `.env.development` - Development environment settings
- `.env.production` - Production environment settings
- `.env.test` - Test environment settings

Example `.env.production`:
```
# Production settings
LOG_LEVEL=info
```

### Service-specific `apps/{service}/.env`

These files should contain ONLY configuration specific to that service:
- Database connection details specific to that service
- Service-specific queue names
- API keys and permissions relevant only to that service
- Other service-specific settings

Example `apps/auth/.env`:
```
# Auth service settings
DATABASE_HOST=postgres
DATABASE_NAME=auth_db
```

## Security Best Practices

1. **Never commit real credentials to Git**
   - Always use `.env.example` files as templates in the repo
   - Real `.env` files should be in `.gitignore`

2. **Minimize duplication**
   - Don't duplicate values across multiple `.env` files
   - Use the hierarchy to your advantage

3. **Secret management in production**
   - In production, consider using a secrets manager instead of `.env` files
   - Docker secrets, Kubernetes secrets, or AWS Parameter Store are recommended

## Environment Variable Access

In the application code, use the ConfigService to access environment variables:

```typescript
// Access variables (automatically follows hierarchy)
constructor(private configService: AppConfigService) {}

getValue() {
  // Will first check service-specific .env, then .env.{NODE_ENV}, then root .env
  return this.configService.get('SOME_VARIABLE', 'default_value');
}
```

## Troubleshooting

If an environment variable isn't being correctly loaded:

1. Check all three levels of `.env` files to see if it's defined in multiple places
2. Look at load order - later files override earlier ones
3. Enable debug logging with `LOG_LEVEL=debug` to see which values are being loaded

## Modifying Environment Variables

When adding a new environment variable:

1. Add it to the appropriate level (shared or service-specific)
2. Add it to all `.env.example` files at the same level
3. Update validation schema in `libs/common/src/config/config.module.ts`
4. Document the purpose of the variable in the `.env.example` file 