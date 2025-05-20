// Load testing utilities
export * from './generators/html-report.generator';
export * from './utils/rate-limit-toggler';

// Docker-friendly environment-based utilities
export * from './env';

// DOCKER BUILD NOTE: CLI tools are commented out for Docker builds
// These CLI utilities are intended for local development only and are
// now exposed via npm/pnpm scripts in package.json.
// For Docker environments, use the dedicated docker scripts:
//   - pnpm run docker:disable-rate-limit:[service]
//   - pnpm run docker:enable-rate-limit:[service]
// See README-LOAD-TESTING.md for more information.

// export * from './cli'; // Commented out for Docker builds

// These files need to be compiled to JavaScript for CLI usage
// The compiled files will be available at dist/libs/common/src/load-testing/cli/ 

// Remember to re-enable rate limiting when finished:
// pnpm run docker:enable-rate-limit:menu
// pnpm run docker:enable-rate-limit:auth 