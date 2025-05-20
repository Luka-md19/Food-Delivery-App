#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { HtmlReportGenerator } from '../generators/html-report.generator';

/**
 * CLI tool for generating HTML reports from k6 test results
 * 
 * Usage:
 *   node generate-report.js <json-file> <service> <test-name> [output-file]
 * 
 * Examples:
 *   node generate-report.js results/auth_baseline.json auth "Baseline Test" 
 *   node generate-report.js results/menu_stress.json menu "Stress Test" reports/menu_stress.html
 */

/**
 * Get report name from file name
 */
function getReportNameFromFileName(jsonFilePath: string): string {
  const fileName = path.basename(jsonFilePath, '.json');
  const parts = fileName.split('_');
  
  if (parts.length > 1) {
    // Capitalize the test type
    const testType = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    return `${testType} Test`;
  }
  
  return 'Load Test';
}

/**
 * Get output path from file name
 */
function getOutputPathFromFileName(jsonFilePath: string, serviceType: string): string {
  const fileName = path.basename(jsonFilePath, '.json');
  return path.join('reports', `${fileName}.html`);
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

/**
 * Run the CLI tool
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generate-report.js <json-file> <service> [test-name] [output-file]');
    console.error('Examples:');
    console.error('  node generate-report.js results/auth_baseline.json auth "Baseline Test"');
    console.error('  node generate-report.js results/menu_stress.json menu "Stress Test" reports/menu_stress.html');
    process.exit(1);
  }
  
  const jsonFilePath = args[0];
  const serviceType = args[1].toLowerCase();
  const testName = args[2] || getReportNameFromFileName(jsonFilePath);
  const outputPath = args[3] || getOutputPathFromFileName(jsonFilePath, serviceType);
  
  // Validate JSON file
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`JSON file not found: ${jsonFilePath}`);
    process.exit(1);
  }
  
  // Create output directory if needed
  const outputDir = path.dirname(outputPath);
  ensureDirectoryExists(outputDir);
  
  // Generate the report
  const success = HtmlReportGenerator.generateReport(jsonFilePath, testName, outputPath, serviceType);
  
  if (success) {
    console.log(`\nReport generated successfully: ${outputPath}`);
    process.exit(0);
  } else {
    console.error(`Failed to generate report for ${jsonFilePath}`);
    process.exit(1);
  }
}

// Run the CLI tool
main(); 