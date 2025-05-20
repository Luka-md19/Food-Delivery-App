# Load Testing Documentation

This document provides a comprehensive guide to load testing for the Food Delivery App microservices.

## Available Services

- **Auth Service**: User authentication and authorization
- **Menu Service**: Menu item management and retrieval

## Load Testing Utilities

The application uses shared load testing utilities located in `libs/common/src/load-testing`.

## Running Load Tests

### For Auth Service

```bash
# Run a specific test type
pnpm run load-test:auth:run baseline
pnpm run load-test:auth:run stress
pnpm run load-test:auth:run spike
pnpm run load-test:auth:run endurance

# Run individual tests directly
pnpm run load-test:auth:baseline
pnpm run load-test:auth:stress 
pnpm run load-test:auth:spike
pnpm run load-test:auth:endurance

# Run all tests in sequence
pnpm run load-test:auth:all

# Run via batch file
cd apps/auth/test/load-test
./run-all-tests.bat
```

### For Menu Service

```bash
# Run a specific test type
pnpm run load-test:menu:run baseline
pnpm run load-test:menu:run stress

# Run all tests in sequence
pnpm run load-test:menu:all

# Run via batch file
cd apps/menu/test/load-test
./run-all-tests.bat
```

## Managing Rate Limiting for Docker

Rate limiting management now uses docker-compose override files for seamless switching between production and testing configurations.

### Quick Commands

```bash
# Disable rate limiting for all services
pnpm run rate-limit:disable:all

# Enable rate limiting for all services
pnpm run rate-limit:enable:all
```

### For Individual Services

```bash
# Auth Service
pnpm run docker:disable-rate-limit:auth  # Disable rate limiting
pnpm run docker:enable-rate-limit:auth   # Enable rate limiting

# Menu Service
pnpm run docker:disable-rate-limit:menu  # Disable rate limiting 
pnpm run docker:enable-rate-limit:menu   # Enable rate limiting
```

### How It Works

The rate limiting management scripts use a docker-compose override approach:

1. **Disabling Rate Limiting**: Uses `docker-compose.yml` and `docker-compose.load-test.yml` together
   - The override file sets `ENABLE_RATE_LIMITING=false` and `THROTTLE_LIMIT=100000`
   - No need to rebuild the image, just restarts the service with the new configuration

2. **Enabling Rate Limiting**: Uses only the default `docker-compose.yml`
   - Returns to standard configuration with rate limiting enabled
   - No need to rebuild the image, just restarts the service

## Generating Reports

### For Auth Service

```bash
# Generate specific reports
pnpm run load-test:auth:report:baseline
pnpm run load-test:auth:report:stress

# Generate all reports
pnpm run generate-reports:auth
```

### For Menu Service

```bash
# Generate specific reports
pnpm run load-test:menu:report:baseline
pnpm run load-test:menu:report:stress
pnpm run load-test:menu:report:smoke

# Generate all reports
pnpm run generate-reports:menu
```

## Cleaning Up

After completing your load tests, you can run the cleanup script to organize and archive the results:

```bash
pnpm run load-test:cleanup
```

## Individual Service Documentation

For more detailed information about each service's load testing:

- [Auth Service Load Testing](./apps/auth/test/load-test/README.md)
- [Menu Service Load Testing](./apps/menu/test/load-test/README.md)

## Running in CI/CD

When running tests in CI/CD environments, it's recommended to use the PowerShell script:

```bash
pnpm exec powershell -ExecutionPolicy Bypass -File ./scripts/run-load-tests.ps1 all
```

This will automatically run all tests and generate reports for both services. 