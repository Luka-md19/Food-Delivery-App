#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { MicroserviceType } from '../utils/rate-limit-toggler';

/**
 * Unified script for running load tests across microservices
 * 
 * Usage:
 *   node run-load-tests.js <service> [test-type]
 * 
 * Examples:
 *   node run-load-tests.js auth baseline
 *   node run-load-tests.js menu stress
 *   node run-load-tests.js auth all
 */

// Get the workspace root
const workspaceRoot = process.cwd();

// Test types
const TEST_TYPES = ['baseline', 'stress', 'spike', 'endurance'];

// Default paths
const LOAD_TEST_PATHS: Record<MicroserviceType, string> = {
  auth: path.join(workspaceRoot, 'apps/auth/test/load-test'),
  menu: path.join(workspaceRoot, 'apps/menu/test/load-test'),
  restaurant: path.join(workspaceRoot, 'apps/restaurant/test/load-test'),
  order: path.join(workspaceRoot, 'apps/order/test/load-test')
};

// Default results paths
const RESULTS_PATHS: Record<MicroserviceType, string> = {
  auth: path.join(workspaceRoot, 'apps/auth/test/load-test/results'),
  menu: path.join(workspaceRoot, 'apps/menu/test/load-test/results'),
  restaurant: path.join(workspaceRoot, 'apps/restaurant/test/load-test/results'),
  order: path.join(workspaceRoot, 'apps/order/test/load-test/results')
};

// Default reports paths
const REPORTS_PATHS: Record<MicroserviceType, string> = {
  auth: path.join(workspaceRoot, 'apps/auth/test/reports'),
  menu: path.join(workspaceRoot, 'apps/menu/test/reports'),
  restaurant: path.join(workspaceRoot, 'apps/restaurant/test/reports'),
  order: path.join(workspaceRoot, 'apps/order/test/reports')
};

/**
 * Ensure a directory exists
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Run a command and return stdout
 */
function runCommand(command: string, cwd: string = workspaceRoot): string {
  try {
    console.log(`Running command: ${command}`);
    return child_process.execSync(command, { cwd, stdio: 'inherit' }).toString();
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error((error as Error).message);
    return '';
  }
}

/**
 * Check if k6 is installed
 */
function checkK6Installed(): boolean {
  try {
    child_process.execSync('k6 version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Disable rate limiting for load testing
 */
function disableRateLimiting(serviceType: MicroserviceType): void {
  console.log(`\n=== Disabling rate limiting for ${serviceType} service ===`);
  
  // Run the PowerShell script to disable rate limiting
  runCommand(`powershell -ExecutionPolicy Bypass -File ${path.join(workspaceRoot, 'scripts/docker-disable-rate-limiting.ps1')} ${serviceType}`);
}

/**
 * Run a specific load test
 */
function runLoadTest(serviceType: MicroserviceType, testType: string): string {
  console.log(`\n=== Running ${testType} test for ${serviceType} service ===`);
  
  const loadTestPath = LOAD_TEST_PATHS[serviceType];
  const resultsPath = RESULTS_PATHS[serviceType];
  
  // Ensure results directory exists
  ensureDirectoryExists(resultsPath);
  
  // Test script path
  const testScript = path.join(loadTestPath, `${testType}-test.js`);
  
  // Skip if test script doesn't exist
  if (!fs.existsSync(testScript)) {
    console.error(`Test script not found: ${testScript}`);
    return '';
  }
  
  // Run the test
  const outputFile = path.join(resultsPath, `${serviceType}_${testType}_results.json`);
  runCommand(`k6 run -o json=${outputFile} ${testScript}`);
  
  return outputFile;
}

/**
 * Generate an HTML report for a test
 */
function generateReport(jsonFile: string, serviceType: MicroserviceType, testType: string): void {
  console.log(`\n=== Generating report for ${testType} test ===`);
  
  // Skip if JSON file doesn't exist
  if (!fs.existsSync(jsonFile)) {
    console.error(`Results file not found: ${jsonFile}`);
    return;
  }
  
  const reportsPath = REPORTS_PATHS[serviceType];
  
  // Ensure reports directory exists
  ensureDirectoryExists(reportsPath);
  
  // Generate the report
  const reportFile = path.join(reportsPath, `${serviceType}_${testType}_report.html`);
  
  // Format test name
  const testName = testType.charAt(0).toUpperCase() + testType.slice(1) + ' Test';
  
  // Run the generate report script
  const generateScript = path.join(workspaceRoot, 'dist/libs/common/src/load-testing/cli/generate-report.js');
  runCommand(`node ${generateScript} ${jsonFile} ${serviceType} "${testName}" ${reportFile}`);
}

/**
 * Re-enable rate limiting after load testing
 */
function enableRateLimiting(serviceType: MicroserviceType): void {
  console.log(`\n=== Re-enabling rate limiting for ${serviceType} service ===`);
  
  // Run the PowerShell script to enable rate limiting
  runCommand(`powershell -ExecutionPolicy Bypass -File ${path.join(workspaceRoot, 'scripts/docker-enable-rate-limiting.ps1')} ${serviceType}`);
}

/**
 * Run all tests for a service
 */
function runAllTests(serviceType: MicroserviceType): void {
  // Disable rate limiting
  disableRateLimiting(serviceType);
  
  // Run each test and generate report
  for (const testType of TEST_TYPES) {
    const jsonFile = runLoadTest(serviceType, testType);
    if (jsonFile) {
      generateReport(jsonFile, serviceType, testType);
    }
  }
  
  // Re-enable rate limiting
  enableRateLimiting(serviceType);
  
  console.log(`\n=== All tests completed for ${serviceType} service ===`);
  console.log(`Reports are available in: ${REPORTS_PATHS[serviceType]}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node run-load-tests.js <service> [test-type]');
    console.error('Available services: auth, menu, restaurant, order');
    console.error('Available test types: baseline, stress, spike, endurance, all');
    process.exit(1);
  }
  
  // Check if k6 is installed
  if (!checkK6Installed()) {
    console.error('k6 is not installed. Please install k6 first:');
    console.error('https://k6.io/docs/get-started/installation/');
    process.exit(1);
  }
  
  const serviceType = args[0].toLowerCase() as MicroserviceType;
  const testType = args.length > 1 ? args[1].toLowerCase() : 'baseline';
  
  // Validate service type
  if (!LOAD_TEST_PATHS[serviceType]) {
    console.error(`Unknown service: ${serviceType}`);
    console.error('Available services: auth, menu, restaurant, order');
    process.exit(1);
  }
  
  // Validate test type or run all tests
  if (testType === 'all') {
    runAllTests(serviceType);
  } else if (!TEST_TYPES.includes(testType)) {
    console.error(`Unknown test type: ${testType}`);
    console.error('Available test types: baseline, stress, spike, endurance, all');
    process.exit(1);
  } else {
    // Disable rate limiting
    disableRateLimiting(serviceType);
    
    // Run the specific test
    const jsonFile = runLoadTest(serviceType, testType);
    
    // Generate the report
    if (jsonFile) {
      generateReport(jsonFile, serviceType, testType);
    }
    
    // Ask if rate limiting should be re-enabled
    console.log('\nDo you want to re-enable rate limiting? (y/n)');
    // In a proper CLI tool, you would use readline to get user input
    // For this script, we'll assume yes
    enableRateLimiting(serviceType);
    
    console.log(`\n=== Test completed for ${serviceType} service ===`);
    console.log(`Report is available at: ${path.join(REPORTS_PATHS[serviceType], `${serviceType}_${testType}_report.html`)}`);
  }
}

// Run the script
main(); 