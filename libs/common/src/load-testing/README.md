# Shared Load Testing Utilities

This directory contains shared utilities for load testing across all microservices in the food delivery app.

## Features

- **HTML Report Generation**: Unified HTML report generator for k6 test results
- **Rate Limiting Management**: Utilities to enable/disable rate limiting during load tests
- **Cross-Service Compatibility**: Common approach for all microservices

## Directory Structure

```
load-testing/
├── cli/                     - CLI tools in TypeScript (not used in Docker)
│   ├── generate-report.ts   - CLI for generating HTML reports
│   └── toggle-rate-limiting.ts  - CLI for managing rate limiting
├── generators/             
│   └── html-report.generator.ts - HTML report generator
├── utils/
│   └── rate-limit-toggler.ts - Rate limit toggling utility
├── env/                     - Environment-based utilities
├── README.md               - This file
└── index.ts                - Exports for the module
```

## Usage

### Docker Environment

For Docker environments, use the package.json scripts to manage rate limiting:

```bash
# Disable rate limiting for a service
pnpm run docker:disable-rate-limit:auth
pnpm run docker:disable-rate-limit:menu

# Enable rate limiting for a service
pnpm run docker:enable-rate-limit:auth
pnpm run docker:enable-rate-limit:menu
```

### Local Development

In local development, you can run the load tests using the available scripts:

```bash
# Run specific test type for a service
pnpm run load-test:auth:run baseline
pnpm run load-test:menu:run stress

# Run all tests for a service
pnpm run load-test:auth:all
pnpm run load-test:menu:all
```

### Generating Reports

Generate reports using the dedicated scripts:

```bash
# Generate specific report
pnpm run load-test:auth:report:baseline
pnpm run load-test:menu:report:stress

# Generate all reports for a service
pnpm run generate-reports:auth
pnpm run generate-reports:menu
```

## Integration with Microservices

Each microservice can use these shared utilities by accessing the scripts defined in package.json.

## Note About Docker Builds

For Docker builds, the CLI tools are excluded from the build to prevent issues with running scripts in containers. This is achieved by:

1. Removing the CLI files during Docker build with:
   ```dockerfile
   RUN rm -rf libs/common/src/load-testing/cli/*.ts libs/common/src/load-testing/cli/*.js
   ```

2. Commenting out the CLI exports in `index.ts`:
   ```typescript
   // export * from './cli'; // Commented out for Docker builds
   ```

## Build Process

After modifying any files, rebuild the common library:

```bash
pnpm run build:common
```

## Additional Documentation

See the main [README-LOAD-TESTING.md](../../../../../README-LOAD-TESTING.md) file for a comprehensive guide on using the load testing utilities. 