import { LogFormat, LogLevel, LogTransport } from '../constants';

/**
 * Options for configuring the logger module
 * Following Interface Segregation Principle by having specific interfaces
 */
export interface LoggerModuleOptions {
  /**
   * Application name to be included in logs
   */
  appName: string;

  /**
   * Log level (debug, info, warn, error)
   * @default 'info'
   */
  level: LogLevel;

  /**
   * Log format (text, json)
   * @default 'json' in production, 'text' otherwise
   */
  format: LogFormat;

  /**
   * Whether to include timestamps in logs
   * @default true
   */
  timestamp?: boolean;

  /**
   * Whether to include request IDs in logs
   * @default true
   */
  trackRequestId?: boolean;

  /**
   * Whether to include user IDs in logs when available
   * @default true
   */
  trackUserId?: boolean;

  /**
   * Whether to redact sensitive information from logs
   * @default true
   */
  redactSensitiveData?: boolean;

  /**
   * Additional fields to redact from logs
   */
  additionalRedactFields?: string[];

  /**
   * Log transports to use
   * @default ['console']
   */
  transports: LogTransport[];

  /**
   * Directory for log files
   * @default 'logs'
   */
  logDir?: string;

  /**
   * Maximum log file size in bytes
   * @default 10485760 (10MB)
   */
  maxFileSize?: number;

  /**
   * Maximum number of log files to keep
   * @default 5
   */
  maxFiles?: number;
} 