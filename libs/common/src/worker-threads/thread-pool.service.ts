import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { 
  TaskData, 
  TaskResult, 
  ThreadTaskType,
  WorkerInfo,
  WorkerStatus
} from './worker-thread.interface';

/**
 * Thread pool service for handling CPU-intensive operations
 * Uses a fixed pool of worker threads that can be reused
 */
@Injectable()
export class ThreadPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThreadPoolService.name);
  private readonly workers: Worker[] = [];
  private readonly workerInfo: Map<number, WorkerInfo> = new Map();
  private readonly pendingTasks: Map<string, { resolve: Function; reject: Function }> = new Map();
  private readonly initializeWorkerPromises: Map<number, { resolve: Function; reject: Function }> = new Map();
  
  private readonly maxWorkers: number;
  private workerScript: string;
  private initialized = false;
  private initializationTimeout = 60000; // 60 seconds timeout for initialization (increased from 30s)
  private readonly createWorkerTimeout = 30000; // 30 seconds timeout for worker creation (increased from 15s)
  
  constructor(private readonly configService: ConfigService) {
    // Get the number of worker threads from config or default to CPU count or 4
    this.maxWorkers = Number(
      this.configService.get<number>('WORKER_THREADS_COUNT', 
      Math.max(4, Math.min(require('os').cpus().length - 1, 8)))
    );
    
    // Primary location for the worker script
    this.workerScript = path.resolve(__dirname, 'worker.js');
    
    this.logger.log(`Thread pool service created with max ${this.maxWorkers} workers`);
  }
  
  /**
   * Initialize the thread pool on module init
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing thread pool...');
      
      // Get the worker script path
      const workerScriptPath = await this.resolveWorkerScriptPath();
      
      if (!workerScriptPath) {
        this.logger.warn('Worker script not found. Continuing without worker threads - using fallback implementation for all operations');
        return;
      }
      
      this.workerScript = workerScriptPath;
      
      // Set a timeout for the entire initialization process
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Thread pool initialization timed out after ${this.initializationTimeout}ms`));
        }, this.initializationTimeout);
      });
      
      // Try to initialize workers with timeout
      try {
        await Promise.race([
          this.initializeWorkers(),
          timeoutPromise
        ]);
        
        this.initialized = true;
        this.logger.log(`Thread pool initialized with ${this.workers.filter(w => w !== undefined).length}/${this.maxWorkers} workers`);
      } catch (error) {
        this.logger.error(`Thread pool initialization timed out: ${error.message}`, ThreadPoolService.name);
        this.logger.warn('Continuing without fully initialized worker threads - using fallback implementation where needed');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize thread pool: ${error.message}`, error.stack);
      this.logger.warn('Continuing without worker threads - using fallback implementation for all operations');
    }
  }
  
  /**
   * Clean up resources on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.terminateAllWorkers();
  }
  
  /**
   * Resolve the worker script path by checking multiple possible locations
   * @returns The resolved path or null if not found
   */
  private async resolveWorkerScriptPath(): Promise<string | null> {
    // Define all possible locations for the worker script
    const possibleLocations = [
      this.workerScript,
      path.resolve(process.cwd(), 'dist/apps/auth/worker.js'),
      path.resolve(process.cwd(), 'apps/auth/src/worker.js'),
      path.resolve('/usr/src/app/dist/apps/auth/worker.js'),
      path.join(process.cwd(), 'worker.js'),
      '/usr/src/app/worker.js',
      // Add Docker-specific paths
      '/app/dist/apps/auth/worker.js',
      '/usr/src/app/apps/auth/src/worker.js'
    ];
    
    this.logger.debug(`Checking for worker script in the following locations: ${possibleLocations.join(', ')}`);
    
    // Try to find the worker script
    for (const location of possibleLocations) {
      try {
        if (fs.existsSync(location)) {
          const stats = fs.statSync(location);
          if (stats.isFile()) {
            this.logger.log(`Found worker script at ${location} (size: ${stats.size} bytes)`);
            return location;
          }
        }
      } catch (error) {
        this.logger.debug(`Error checking location ${location}: ${error.message}`);
      }
    }
    
    // If we get here, no worker script was found
    this.logger.error(`Worker script not found. Checked the following locations: ${possibleLocations.join(', ')}`);
    return null;
  }
  
  /**
   * Initialize worker threads
   */
  private async initializeWorkers(): Promise<void> {
    const initPromises: Promise<void>[] = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      initPromises.push(this.createWorker(i));
    }
    
    await Promise.allSettled(initPromises);
    
    // Check how many workers were successfully created
    const successfulWorkers = this.workers.filter(w => w !== undefined).length;
    if (successfulWorkers === 0) {
      throw new Error('No worker threads could be created successfully');
    } else if (successfulWorkers < this.maxWorkers) {
      this.logger.warn(`Only ${successfulWorkers}/${this.maxWorkers} worker threads were created successfully`);
    }
  }
  
  /**
   * Create a worker thread
   */
  private async createWorker(id: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.logger.debug(`Creating worker ${id} using script at ${this.workerScript}`);
        
        // Create a promise for worker initialization
        const workerPromise = { resolve, reject };
        this.initializeWorkerPromises.set(id, workerPromise);
        
        // Set worker timeout
        const timeoutId = setTimeout(() => {
          this.logger.error(`Worker ${id} initialization timed out after ${this.createWorkerTimeout}ms`);
          const workerInfo = this.workerInfo.get(id);
          if (workerInfo) {
            workerInfo.status = WorkerStatus.ERROR;
            workerInfo.errors++;
          }
          this.initializeWorkerPromises.delete(id);
          reject(new Error(`Worker ${id} initialization timed out`));
        }, this.createWorkerTimeout);
        
        // Create and initialize the worker info
        this.workerInfo.set(id, {
          id,
          status: WorkerStatus.ERROR, // Start as error until initialized
          taskCount: 0,
          errors: 0
        });
        
        // Create the worker
        const worker = new Worker(this.workerScript, {
          workerData: {
            workerId: id,
          }
        });
        
        // Handle worker messages
        worker.on('message', (message) => {
          this.onMessage(message, id);
        });
        
        // Handle worker errors
        worker.on('error', (error) => {
          this.logger.error(`Worker ${id} error: ${error.message}`, error.stack);
          const workerInfo = this.workerInfo.get(id);
          if (workerInfo) {
            workerInfo.status = WorkerStatus.ERROR;
            workerInfo.errors++;
          }
          clearTimeout(timeoutId);
          this.initializeWorkerPromises.delete(id);
          reject(error);
        });
        
        // Handle worker exit
        worker.on('exit', (code) => {
          this.logger.warn(`Worker ${id} exited with code ${code}`);
          const workerInfo = this.workerInfo.get(id);
          if (workerInfo) {
            workerInfo.status = WorkerStatus.TERMINATED;
          }
          this.workers[id] = undefined;
        });
        
        // Store the worker
        this.workers[id] = worker;
      } catch (error) {
        this.logger.error(`Failed to create worker ${id}: ${error.message}`, error.stack);
        this.initializeWorkerPromises.delete(id);
        reject(error);
      }
    });
  }
  
  /**
   * Execute a task in a worker thread
   */
  private async executeTask<T, R>(
    type: ThreadTaskType, 
    payload: T
  ): Promise<R> {
    // Check if initialized and at least one worker is available
    if (!this.initialized || this.workers.filter(w => w !== undefined).length === 0) {
      this.logger.warn(`Thread pool is not initialized or has no workers, using fallback implementation for task type: ${type}`);
      return this.executeTaskFallback(type, payload);
    }
    
    return new Promise<R>((resolve, reject) => {
      try {
        // Create a task with unique ID
        const taskId = crypto.randomUUID();
        
        // Map ThreadTaskType to WorkerAction for the worker script
        let action: string;
        switch (type) {
          case ThreadTaskType.JWT_VERIFY:
            action = 'VERIFY_JWT';
            break;
          case ThreadTaskType.JWT_SIGN:
            action = 'SIGN_JWT';
            break;
          case ThreadTaskType.CRYPTO_HASH:
            action = 'GENERATE_HASH';
            break;
          case ThreadTaskType.CRYPTO_BCRYPT:
            action = 'HASH_PASSWORD';
            break;
          case ThreadTaskType.CRYPTO_COMPARE:
            action = 'COMPARE_PASSWORD';
            break;
          default:
            throw new Error(`Unknown task type: ${type}`);
        }
        
        // Create message for the worker
        const workerMessage = {
          id: taskId,
          action, // Use the mapped action for the worker
          payload
        };
        
        // Get an available worker
        const workerId = this.getAvailableWorker();
        
        if (workerId === null) {
          this.logger.warn('No available workers in the pool, using fallback implementation');
          // Use fallback implementation instead of throwing an error
          this.executeTaskFallback(type, payload).then(resolve).catch(reject);
          return;
        }
        
        // Add timeout to prevent deadlocks
        const timeoutId = setTimeout(() => {
          if (this.pendingTasks.has(taskId)) {
            this.logger.warn(`Task ${taskId} (${type}) timed out after 5000ms, using fallback implementation`);
            this.pendingTasks.delete(taskId);
            
            // Use fallback implementation
            this.executeTaskFallback(type, payload).then(resolve).catch(reject);
          }
        }, 5000);
        
        // Store the promise handlers with timeout cleanup
        this.pendingTasks.set(taskId, { 
          resolve: (value) => {
            clearTimeout(timeoutId);
            resolve(value);
          }, 
          reject: (error) => {
            clearTimeout(timeoutId);
            reject(error);
          } 
        });
        
        // Update worker status
        const workerInfo = this.workerInfo.get(workerId);
        if (workerInfo) {
          workerInfo.status = WorkerStatus.BUSY;
        }
        
        // Send the task to the worker
        this.workers[workerId].postMessage(workerMessage);
      } catch (error) {
        this.logger.error(`Failed to execute task: ${error.message}`, error.stack);
        // Try fallback implementation
        this.executeTaskFallback(type, payload).then(resolve).catch(reject);
      }
    });
  }
  
  /**
   * Execute a task without worker threads (fallback implementation)
   */
  private async executeTaskFallback<T, R>(
    type: ThreadTaskType,
    payload: any // Use any type for the payload to avoid TypeScript errors
  ): Promise<R> {
    this.logger.debug(`Using fallback implementation for task type: ${type}`);
    
    switch (type) {
      case ThreadTaskType.JWT_VERIFY:
        // Use built-in modules for verification
        const jwt = require('jsonwebtoken');
        return jwt.verify(payload.token, payload.secret, payload.options) as R;
        
      case ThreadTaskType.JWT_SIGN:
        // Use built-in modules for signing
        const jwtSign = require('jsonwebtoken');
        return jwtSign.sign(payload.payload, payload.secret, payload.options) as R;
        
      case ThreadTaskType.CRYPTO_HASH:
        // Use built-in crypto for hashing
        const hash = crypto.createHash(payload.algorithm || 'sha256')
          .update(payload.data)
          .digest('hex');
        return hash as unknown as R;
        
      case ThreadTaskType.CRYPTO_BCRYPT:
        try {
          // Try to use bcrypt, fallback to simple crypto hash if not available
          const bcrypt = require('bcrypt');
          return await bcrypt.hash(payload.password, payload.saltRounds || 10) as unknown as R;
        } catch (e) {
          this.logger.warn(`Bcrypt not available for hashing, using sha256 fallback: ${e.message}`);
          // Fallback to simple hash
          const saltedHash = crypto.createHash('sha256')
            .update(payload.password + 'fallback-salt')
            .digest('hex');
          return saltedHash as unknown as R;
        }
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }
  
  /**
   * Get an available (idle) worker from the pool
   */
  private getAvailableWorker(): number | null {
    // First try to find a worker that's idle
    for (let i = 0; i < this.workers.length; i++) {
      if (this.workers[i] && this.workerInfo.get(i)?.status === WorkerStatus.IDLE) {
        return i;
      }
    }
    
    // If no idle worker found, try to find any worker
    for (let i = 0; i < this.workers.length; i++) {
      if (this.workers[i]) {
        return i;
      }
    }
    
    // No workers available
    return null;
  }
  
  /**
   * Verify a JWT token using a worker thread
   */
  async verifyJwt<T = any>(token: string, secret: string, options?: any): Promise<T> {
    return this.executeTask<{ token: string; secret: string; options?: any }, T>(
      ThreadTaskType.JWT_VERIFY,
      { token, secret, options }
    );
  }
  
  /**
   * Sign a JWT token using a worker thread
   */
  async signJwt<T = string>(payload: object, secret: string, options?: any): Promise<T> {
    return this.executeTask<{ payload: object; secret: string; options?: any }, T>(
      ThreadTaskType.JWT_SIGN,
      { payload, secret, options }
    );
  }
  
  /**
   * Generate a hash using a worker thread
   */
  async generateHash(data: string, algorithm: string = 'sha256'): Promise<string> {
    return this.executeTask<{ data: string; algorithm: string }, string>(
      ThreadTaskType.CRYPTO_HASH,
      { data, algorithm }
    );
  }
  
  /**
   * Hash a password using bcrypt in a worker thread
   */
  async hashPassword(password: string, saltRounds: number = 10): Promise<string> {
    return this.executeTask<{ password: string; saltRounds: number }, string>(
      ThreadTaskType.CRYPTO_BCRYPT,
      { password, saltRounds }
    );
  }
  
  /**
   * Terminate all worker threads
   */
  private async terminateAllWorkers(): Promise<void> {
    this.logger.log('Terminating all worker threads...');
    
    const terminatePromises: Promise<number>[] = [];
    
    for (let i = 0; i < this.workers.length; i++) {
      if (this.workers[i]) {
        const promise = this.workers[i].terminate();
        terminatePromises.push(promise);
      }
    }
    
    try {
      await Promise.all(terminatePromises);
      this.logger.log('All worker threads terminated successfully');
    } catch (error) {
      this.logger.error(`Error terminating worker threads: ${error.message}`, error.stack);
    }
    
    this.workers.length = 0;
    this.workerInfo.clear();
    this.initialized = false;
  }
  
  /**
   * Get stats about the thread pool
   */
  getStats(): {
    workers: number;
    maxWorkers: number;
    idle: number;
    busy: number;
    tasks: number;
    pendingTasks: number;
  } {
    const workersCount = this.workers.filter(w => w !== undefined).length;
    let idleCount = 0;
    let busyCount = 0;
    let taskCount = 0;
    
    for (const info of this.workerInfo.values()) {
      if (info.status === WorkerStatus.IDLE) {
        idleCount++;
      } else if (info.status === WorkerStatus.BUSY) {
        busyCount++;
      }
      taskCount += info.taskCount;
    }
    
    return {
      workers: workersCount,
      maxWorkers: this.maxWorkers,
      idle: idleCount,
      busy: busyCount,
      tasks: taskCount,
      pendingTasks: this.pendingTasks.size
    };
  }

  /**
   * Handle messages from workers
   */
  private onMessage(response: any, workerId: number): void {
    try {
      const { id, success, result, error, type } = response;
      
      if (id === 'init') {
        // Handle worker initialization
        if (success) {
          this.logger.debug(`Worker ${workerId} initialized successfully`);
          const workerInfo = this.workerInfo.get(workerId);
          if (workerInfo) {
            workerInfo.status = WorkerStatus.IDLE;
          }
          this.initializeWorkerPromises[workerId]?.resolve(workerId);
        } else {
          this.logger.error(`Worker ${workerId} initialization failed: ${error?.message}`);
          this.initializeWorkerPromises[workerId]?.reject(new Error(error?.message || 'Unknown error'));
        }
        return;
      }
      
      if (id === 'error') {
        // Handle error messages
        this.logger.error(`Worker ${workerId} error: ${error?.message}`, error?.stack);
        const workerInfo = this.workerInfo.get(workerId);
        if (workerInfo) {
          workerInfo.status = WorkerStatus.ERROR;
          workerInfo.errors++;
        }
        return;
      }
      
      // Get the pending task
      const task = this.pendingTasks.get(id);
      if (!task) {
        this.logger.warn(`Received response for unknown task: ${id}`);
        return;
      }
      
      // Mark worker as idle
      const workerInfo = this.workerInfo.get(workerId);
      if (workerInfo) {
        workerInfo.status = WorkerStatus.IDLE;
        workerInfo.taskCount++;
        workerInfo.lastTaskAt = new Date();
      }
      
      // Remove from pending tasks
      this.pendingTasks.delete(id);
      
      // Handle result or error
      if (success === false || error) {
        // Handle error
        const errorMessage = error?.message || 'Unknown error';
        const errorStack = error?.stack;
        this.logger.error(`Worker ${workerId} task ${id} failed: ${errorMessage}`, errorStack);
        task.reject(new Error(errorMessage));
      } else {
        // Handle success
        task.resolve(result);
      }
    } catch (err) {
      this.logger.error(`Error handling worker message: ${err.message}`, err.stack);
    }
  }
} 