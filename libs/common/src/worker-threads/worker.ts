import { parentPort, workerData } from 'worker_threads';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { TaskData, TaskResult, ThreadTaskType } from './worker-thread.interface';

/**
 * Worker thread implementation that handles CPU-intensive tasks
 */
if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

// Log worker startup with ID
console.log(`Worker thread ${workerData.workerId} started`);

// Handle messages from parent thread
parentPort.on('message', async (taskData: TaskData) => {
  try {
    const result = await processTask(taskData);
    parentPort?.postMessage(result);
  } catch (error) {
    parentPort?.postMessage({
      id: taskData.id,
      type: taskData.type,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } as TaskResult);
  }
});

/**
 * Process a task based on its type
 */
async function processTask(taskData: TaskData): Promise<TaskResult> {
  const { id, type, payload } = taskData;
  
  switch (type) {
    case ThreadTaskType.JWT_VERIFY:
      return {
        id,
        type,
        result: verifyJwt(payload.token, payload.secret, payload.options)
      };
      
    case ThreadTaskType.JWT_SIGN:
      return {
        id,
        type,
        result: signJwt(payload.payload, payload.secret, payload.options)
      };
      
    case ThreadTaskType.CRYPTO_HASH:
      return {
        id,
        type,
        result: createHash(payload.data, payload.algorithm, payload.encoding)
      };
      
    case ThreadTaskType.CRYPTO_BCRYPT:
      return {
        id,
        type,
        result: await hashPassword(payload.password, payload.saltRounds)
      };
      
    case ThreadTaskType.CRYPTO_COMPARE:
      return {
        id,
        type,
        result: await comparePassword(payload.password, payload.hash)
      };
      
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

/**
 * Verify a JWT token
 */
function verifyJwt(token: string, secret: string, options?: jwt.VerifyOptions): any {
  return jwt.verify(token, secret, options);
}

/**
 * Sign a JWT token
 */
function signJwt(payload: string | object | Buffer, secret: string, options?: jwt.SignOptions): string {
  return jwt.sign(payload, secret, options);
}

/**
 * Create a cryptographic hash
 */
function createHash(data: string | Buffer, algorithm: string = 'sha256', encoding: crypto.BinaryToTextEncoding = 'hex'): string {
  return crypto.createHash(algorithm).update(data).digest(encoding);
}

/**
 * Hash a password with bcrypt
 */
async function hashPassword(password: string, saltRounds: number = 10): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 */
async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Send ready message to parent
parentPort.postMessage({ ready: true, workerId: workerData.workerId }); 