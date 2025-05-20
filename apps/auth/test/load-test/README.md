# Auth Service Load Testing

This directory contains load testing scripts for the auth service using k6.

## ⚠️ Important: Shared Utilities

The auth service leverages the shared load testing utilities in `libs/common/src/load-testing`. 
Most of the utility code has been moved to the shared implementation to reduce code duplication across services.

## Prerequisites

1. Install k6: [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)
2. Make sure you have Node.js installed
3. Build the common library: `pnpm run build:common`

## Quick Start

1. Start the auth service locally:
   ```
   ./start-auth-service.bat
   ```

2. Run a specific test:
   ```
   # Using the available scripts
   pnpm run load-test:auth:run baseline
   
   # Or use the specific test scripts
   pnpm run load-test:auth:baseline
   ```

3. To run all tests in sequence:
   ```
   pnpm run load-test:auth:all
   ```

## Rate Limiting

### For Docker Environment

For load testing in Docker environments, use these commands to manage rate limiting:

```bash
# Disable rate limiting for auth service in Docker
pnpm run docker:disable-rate-limit:auth

# Re-enable rate limiting for auth service in Docker
pnpm run docker:enable-rate-limit:auth
```

These commands will:
1. Create the necessary environment configurations
2. Rebuild the Docker image
3. Recreate the container with the updated settings

## Test Types

1. **Baseline Test**: A standard load test with moderate traffic (50 VUs for 30 seconds)
2. **Stress Test**: Tests the service under higher load (100 VUs ramping up over 1 minute)
3. **Spike Test**: Tests the service's resilience to sudden traffic spikes (0 to 200 VUs in short bursts)
4. **Endurance Test**: Tests the service under sustained load over a longer period (30 VUs for 5 minutes)
5. **Realistic Test**: Simulates real-world usage patterns with varying load, multiple operations, and user workflows (up to 800 VUs over 30 minutes)

## Project Organization

The load testing suite for the Auth service is organized as follows:

```
auth/test/load-test/
├── load-types/         # Test type definitions and utilities
│   ├── baseline-test.js
│   ├── stress-test.js
│   ├── spike-test.js
│   ├── endurance-test.js
│   ├── realistic-test.js
│   ├── smoke-test.js
│   └── utils.js        # Common testing utilities
│
├── commands/           # Command scripts to run tests
│   ├── run-all-tests.bat
│   ├── run-baseline-test.bat
│   ├── run-stress-test.bat
│   ├── run-spike-test.bat
│   ├── run-endurance-test.bat
│   └── run-realistic-test.bat
│
├── results/            # Test results in JSON format
└── reports/            # Generated HTML reports
```

## Running Tests

You can run the tests using either npm/pnpm scripts or the provided batch files:

### Using npm/pnpm:

```bash
# Run all tests in sequence
pnpm run load-test:auth

# Run individual tests
pnpm run load-test:auth:baseline
pnpm run load-test:auth:stress
pnpm run load-test:auth:spike
pnpm run load-test:auth:endurance
pnpm run load-test:auth:realistic
```

### Using batch files (from the load-test directory):

```bash
# Run all tests in sequence
cd commands
.\run-all-tests.bat

# Run individual tests
cd commands
.\run-baseline-test.bat
.\run-stress-test.bat
.\run-spike-test.bat
.\run-endurance-test.bat
.\run-realistic-test.bat
```

## HTML Reports

Reports are generated automatically after each test run. You'll find them in the `reports` directory.

If you need to manually generate a report from an existing JSON results file:

```bash
# Use the available report scripts
pnpm run generate-report:auth:baseline
pnpm run generate-report:auth:stress
pnpm run generate-report:auth:spike
pnpm run generate-report:auth:endurance
pnpm run generate-report:auth:realistic
```

## Understanding the "Do you want to continue with more intensive tests?" prompt

When running the test scripts, you'll be asked if you want to continue with more intensive tests. 

- If you answer `y`, the script will run more demanding stress, spike, and endurance tests
- If you answer `n`, only the baseline test will be executed

It's recommended to first fix any issues with the baseline test before running the more intensive tests.

## Results

Test results are saved in the `results` directory in JSON format:
- `baseline_results.json`
- `stress_results.json`
- `spike_results.json`
- `endurance_results.json`
- `realistic_results.json`

## Running with Docker

If you're using Docker to run your auth service, you'll need to:

1. Modify the `utils.js` file to use the correct hostname:
   ```javascript
   // Environment configuration
   export const config = {
     baseUrl: __ENV.BASE_URL || 'http://auth:3000',
     // ...
   }
   ```

2. Run the tests from inside the Docker network or from a container that can access the auth service.

## Common Issues

### Connection Errors

If you see errors like "no connection could be made", check:
- Is the auth service running locally on port 3000?
- Is the auth service healthy? Check http://localhost:3000/health in your browser
- Are there any firewalls blocking the connection?

### API Endpoint Errors (404 Not Found)

If you see "Cannot POST /auth/register" or similar 404 errors:
- Remember that the auth service uses an API prefix - all endpoints should be prefixed with `/api`
- The correct endpoint format is: `http://localhost:3000/api/auth/register`
- If you're still having issues, check the auth service logs to see what endpoints are registered
- You can also try checking the Swagger docs at http://localhost:3000/api/docs

### Registration/Login Failures

If health checks pass but registration or login fails, check:
- Auth service logs for error messages
- Manually test the API endpoints using Postman or curl to verify the correct request format
- Verify that your database is properly set up and accessible
- Make sure all required fields are included in your request payload

## Customization

To customize the test parameters, edit the options in each test file. For example, in `baseline-test.js`:

```javascript
export const options = {
  vus: 50,              // Number of virtual users
  duration: '30s',      // Test duration
  thresholds: {
    // Performance thresholds
  }
};
```

## Restoring Rate Limiting for Production

**IMPORTANT**: Before deploying to production, make sure rate limiting is properly enabled:

1. Check `app.module.ts` to ensure the correct ThrottlerModule configuration is active
2. Run the scripts/check-rate-limiting.js script to verify rate limiting status 