/**
 * Interface for worker thread tasks
 */
export interface TaskData<T = any, R = any> {
  /** Unique ID to identify this task */
  id: string;
  /** Type of task to execute */
  type: string;
  /** Data required for the task */
  payload: T;
}

/**
 * Interface for worker thread response
 */
export interface TaskResult<R = any> {
  /** ID of the original task */
  id: string;
  /** Type of task that was executed */
  type: string;
  /** Result data */
  result?: R;
  /** Error if any occurred */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Actions that can be performed by worker threads
 */
export enum WorkerAction {
  VERIFY_JWT = 'VERIFY_JWT',
  SIGN_JWT = 'SIGN_JWT',
  HASH_PASSWORD = 'HASH_PASSWORD',
  COMPARE_PASSWORD = 'COMPARE_PASSWORD',
  GENERATE_HASH = 'GENERATE_HASH',
}

/**
 * Message sent to a worker thread
 */
export interface WorkerMessage {
  /** Unique ID to identify this message */
  id: string;
  /** Action to perform */
  action: WorkerAction;
  /** Data payload for the action */
  payload: any;
}

/**
 * Response from a worker thread
 */
export interface WorkerResponse {
  /** ID of the original message */
  id: string;
  /** Whether the operation was successful */
  success: boolean;
  /** Result data */
  result?: any;
  /** Error if any occurred */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Interface for operations that can be delegated to worker threads
 */
export enum ThreadTaskType {
  JWT_VERIFY = 'jwt:verify',
  JWT_SIGN = 'jwt:sign',
  CRYPTO_HASH = 'crypto:hash',
  CRYPTO_BCRYPT = 'crypto:bcrypt',
  CRYPTO_COMPARE = 'crypto:compare',
}

/**
 * Worker status types
 */
export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  TERMINATED = 'terminated',
}

/**
 * Worker info with metadata
 */
export interface WorkerInfo {
  id: number;
  status: WorkerStatus;
  taskCount: number;
  lastTaskAt?: Date;
  errors: number;
} 