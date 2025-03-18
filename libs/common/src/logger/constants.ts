/**
 * Constants for the logger module
 */

export const LOGGER_MODULE_OPTIONS = 'LOGGER_MODULE_OPTIONS';
export const REQUEST_ID_HEADER = 'X-Request-ID';
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';
export const USER_ID_HEADER = 'X-User-ID';

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log formats
 */
export enum LogFormat {
  JSON = 'json',
  TEXT = 'text'
}

/**
 * Log transports
 */
export enum LogTransport {
  CONSOLE = 'console',
  FILE = 'file',
  DAILY_ROTATE_FILE = 'daily-rotate-file'
}

/**
 * Sensitive data patterns to be redacted from logs
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'api_key',
  'apiKey',
  'api-key',
  'credit_card',
  'creditCard',
  'credit-card',
  'cvv',
  'ssn',
];

export const REQUEST_ID = 'requestId';
export const USER_ID = 'userId'; 