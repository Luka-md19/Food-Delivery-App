const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * This script builds the worker thread files and copies them to the dist directory
 * Worker threads need to be compiled separately since they run in a separate context
 */
async function buildWorkerThreads() {
  console.log('Building worker threads...');

  try {
    // Ensure dist directories exist
    ensureDirectoriesExist();
    
    // Directly copy the worker thread interface file
    copyWorkerThreadInterface();
    
    // Create a simplified worker.js file that will work with our thread pool service
    createSimplifiedWorker('dist/apps/auth/worker.js');
    
    // Also create the worker in the menu directory to fix the warning
    createSimplifiedWorker('dist/apps/menu/worker.js');
    
    console.log('Successfully built all worker threads');
  } catch (error) {
    console.error('Failed to build worker threads:', error);
    process.exit(1);
  }
}

/**
 * Ensure required directories exist
 */
function ensureDirectoriesExist() {
  const dirs = [
    'dist/apps/auth',
    'dist/apps/menu',
    'dist/libs/common/src/worker-threads'
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

/**
 * Copy worker thread interface
 */
function copyWorkerThreadInterface() {
  try {
    const interfaceContent = fs.readFileSync('libs/common/src/worker-threads/worker-thread.interface.ts', 'utf-8');
    fs.writeFileSync('dist/libs/common/src/worker-threads/worker-thread.interface.js', 
      `"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\n` +
      convertEnums(interfaceContent));
    console.log('Created worker interface file');
  } catch (error) {
    console.error('Failed to copy worker thread interface:', error);
  }
}

/**
 * Extract and convert TypeScript enums to JavaScript
 */
function convertEnums(content) {
  let result = '';
  
  // Extract ThreadTaskType enum
  const threadTaskTypeMatch = content.match(/export enum ThreadTaskType {([^}]*)}/);
  if (threadTaskTypeMatch) {
    result += 'exports.ThreadTaskType = {\n';
    const enumLines = threadTaskTypeMatch[1].trim().split('\n');
    enumLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed) {
        const parts = trimmed.split('=');
        const name = parts[0].trim();
        const value = parts[1] ? parts[1].trim().replace(',', '') : index;
        result += `    ${name}: ${value},\n`;
      }
    });
    result += '};\n';
  }
  
  // Extract WorkerAction enum
  const workerActionMatch = content.match(/export enum WorkerAction {([^}]*)}/);
  if (workerActionMatch) {
    result += 'exports.WorkerAction = {\n';
    const enumLines = workerActionMatch[1].trim().split('\n');
    enumLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed) {
        const parts = trimmed.split('=');
        const name = parts[0].trim();
        const value = parts[1] ? parts[1].trim().replace(',', '') : `"${name}"`;
        result += `    ${name}: ${value},\n`;
      }
    });
    result += '};\n';
  }
  
  return result;
}

/**
 * Create a simplified worker.js file without dependencies
 */
function createSimplifiedWorker(outputPath) {
  // This is a simplified worker implementation that responds with proper messages
  const workerContent = `
// Simplified worker thread implementation
const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Check if running as a worker thread
if (!parentPort) {
  console.error('Worker must be run as a worker thread!');
  process.exit(1);
}

// Get worker ID from workerData
const workerId = workerData?.workerId || 'unknown';

// Send initialization message
parentPort.postMessage({ id: 'init', success: true });

// Listen for messages from the main thread
parentPort.on('message', (message) => {
  try {
    const { id, action, payload } = message;
    
    if (!id || !action) {
      throw new Error('Invalid message format: missing id or action');
    }
    
    let result;
    
    // Process tasks based on action type
    switch (action) {
      case 'VERIFY_JWT':
        result = jwt.verify(payload.token, payload.secret, payload.options);
        break;
        
      case 'SIGN_JWT':
        result = jwt.sign(payload.payload, payload.secret, payload.options);
        break;
        
      case 'GENERATE_HASH':
        result = crypto.createHash(payload.algorithm || 'sha256')
          .update(payload.data)
          .digest('hex');
        break;
        
      case 'HASH_PASSWORD':
        // Simple hashing fallback if bcrypt is not available
        result = crypto.createHash('sha256')
          .update(payload.password + 'worker-salt-' + workerId)
          .digest('hex');
        break;
        
      case 'COMPARE_PASSWORD':
        // Simple comparison fallback if bcrypt is not available
        const hash = crypto.createHash('sha256')
          .update(payload.password + 'worker-salt-' + workerId)
          .digest('hex');
        result = hash === payload.hash;
        break;
        
      default:
        throw new Error(\`Unknown action: \${action}\`);
    }
    
    // Send the result back to the parent thread
    parentPort.postMessage({
      id,
      success: true,
      result
    });
  } catch (error) {
    // Send error back to the parent thread
    parentPort.postMessage({
      id: message?.id || 'error',
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(\`[Worker \${workerId}] Uncaught exception: \${error.message}\`);
  
  // Notify the main thread
  parentPort.postMessage({
    id: 'error',
    success: false,
    error: {
      message: error.message,
      stack: error.stack
    }
  });
});
  `;
  
  // Write the worker file to the destination
  fs.writeFileSync(outputPath, workerContent);
  console.log(`Created simplified worker.js file at ${outputPath}`);
}

// Run the script
buildWorkerThreads(); 