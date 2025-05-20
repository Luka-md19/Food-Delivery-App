/**
 * Worker thread for auth service
 * Handles CPU-intensive operations like JWT verification
 */
import { parentPort, workerData } from 'worker_threads';
import { 
  TaskData, 
  TaskResult, 
  ThreadTaskType, 
  WorkerAction, 
  WorkerMessage, 
  WorkerResponse 
} from '../../../libs/common/src/worker-threads/worker-thread.interface';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// Initialize worker
if (!parentPort) {
  throw new Error('Worker must be run as a worker thread!');
}

// Worker ID from worker data
const workerId = workerData?.workerId ?? 'unknown';

// Setup error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[Worker ${workerId}] Uncaught exception:`, error);
  
  // Try to send error back to main thread
  if (parentPort) {
    parentPort.postMessage({
      id: 'error',
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    } as WorkerResponse);
  }
  
  // Exit with error code
  process.exit(1);
});

// Setup error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[Worker ${workerId}] Unhandled rejection at:`, promise, 'reason:', reason);
  
  // Try to send error back to main thread
  if (parentPort) {
    parentPort.postMessage({
      id: 'error',
      success: false,
      error: {
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      }
    } as WorkerResponse);
  }
});

// Log worker startup
console.log(`[Worker ${workerId}] Starting...`);

// Handle messages from the main thread
parentPort.on('message', async (message: TaskData) => {
  try {
    const { id, type, payload } = message;
    let result: any;

    // Process different types of tasks
    switch (type) {
      case ThreadTaskType.JWT_VERIFY:
        result = verifyJwt(payload.token, payload.secret, payload.options);
        break;
      case ThreadTaskType.JWT_SIGN:
        result = signJwt(payload.payload, payload.secret, payload.options);
        break;
      case ThreadTaskType.CRYPTO_BCRYPT:
        result = await hashPassword(payload.password, payload.saltRounds);
        break;
      case ThreadTaskType.CRYPTO_HASH:
        result = generateHash(payload.data, payload.algorithm);
        break;
      case ThreadTaskType.CRYPTO_COMPARE:
        result = await comparePassword(payload.password, payload.hash);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    // Send the result back to the main thread
    parentPort!.postMessage({
      id,
      type,
      result,
    } as TaskResult);
  } catch (error) {
    console.error(`[Worker ${workerId}] Error processing task:`, error);
    
    // Send any errors back to the main thread
    parentPort!.postMessage({
      id: message.id,
      type: message.type,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
    } as TaskResult);
  }
});

// Signal that the worker is ready
parentPort.postMessage({ 
  id: 'init', 
  success: true, 
  result: `Worker ${workerId} initialized`
} as WorkerResponse);

// Helper functions for CPU-intensive operations
function verifyJwt(token: string, secret: string, options?: jwt.VerifyOptions) {
  return jwt.verify(token, secret, options);
}

function signJwt(payload: object, secret: string, options?: jwt.SignOptions) {
  return jwt.sign(payload, secret, options);
}

async function hashPassword(password: string, saltRounds: number): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateHash(data: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
} 

// Log that the worker is ready
console.log(`[Worker ${workerId}] Ready to process tasks`); 