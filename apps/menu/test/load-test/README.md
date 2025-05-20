# Menu Service Load Testing

This directory contains load testing scripts for the menu service using k6.

## ⚠️ Important: Shared Utilities

The menu service leverages the shared load testing utilities in `libs/common/src/load-testing`. 
Most of the utility code has been moved to the shared implementation to reduce code duplication across services.

## Prerequisites

1. Install k6: [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)
2. Make sure you have Node.js installed
3. Build the common library: `pnpm run build:common`

## Quick Start

1. Start the menu service locally

2. Run a specific test:
   ```bash
   # Using the available scripts
   pnpm run load-test:menu:run baseline
   pnpm run load-test:menu:run smoke
   pnpm run load-test:menu:run stress
   pnpm run load-test:menu:run spike
   pnpm run load-test:menu:run endurance
   pnpm run load-test:menu:run realistic
   
   # Or use the simplified batch files
   ./run-baseline-test.bat
   ./run-realistic-test.bat
   # etc.
   ```

3. To run all tests in sequence:
   ```bash
   pnpm run load-test:menu:all
   ```

## Rate Limiting

### For Docker Environment

For load testing in Docker environments, use these commands to manage rate limiting:

```bash
# Disable rate limiting for menu service in Docker
pnpm run docker:disable-rate-limit:menu

# Re-enable rate limiting for menu service in Docker
pnpm run docker:enable-rate-limit:menu
```

These commands will:
1. Create the necessary environment configurations
2. Rebuild the Docker image
3. Recreate the container with the updated settings

## Test Types

1. **Smoke Test**: A lightweight test to verify functionality (5 VUs for 1 minute)
2. **Baseline Test**: A standard load test with moderate traffic (25 VUs for 4 minutes)
3. **Stress Test**: Tests the service under higher load (up to 1000 VUs ramping up over time)
4. **Spike Test**: Tests the service with sudden traffic surges (spike to 1500 VUs)
5. **Endurance Test**: Tests the service under moderate load for an extended period (200 VUs for 15+ minutes)
6. **Realistic Test**: Simulates real-world traffic patterns (up to 800 VUs over 30 minutes)

## Project Organization

The load test suite is organized as follows:

- `load-types/*.js` - Main test script files (baseline, stress, etc.)
- `commands/*.bat` - Batch files to run the tests
- `results/` - Directory for test results (JSON files)
- `reports/` - Directory for generated HTML reports

## HTML Reports

Reports are generated using the PowerShell scripts. After running a test, you'll find reports in the `reports` directory.

To manually generate a report from an existing JSON results file:

```bash
# Use the generated report scripts
pnpm run generate-report:menu:baseline
pnpm run generate-report:menu:stress
pnpm run generate-report:menu:spike
pnpm run generate-report:menu:endurance
pnpm run generate-report:menu:realistic
``` 