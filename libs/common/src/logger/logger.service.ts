import { Inject, Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, Logger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { LOGGER_MODULE_OPTIONS, LogFormat, LogLevel, LogTransport } from './constants';
import { LoggerModuleOptions } from './interfaces';

/**
 * Custom logger service that extends NestJS LoggerService
 * This follows the Single Responsibility Principle by focusing only on logging
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private context?: string;

  constructor(
    @Inject(LOGGER_MODULE_OPTIONS)
    private readonly options: LoggerModuleOptions,
  ) {
    this.initializeLogger();
  }

  /**
   * Initialize the Winston logger with configured options
   */
  private initializeLogger() {
    const { format: logFormat, level, transports: logTransports } = this.options;

    const formatters = [
      format.timestamp(),
      format.errors({ stack: true }),
      logFormat === LogFormat.JSON ? format.json() : format.simple(),
    ];

    const transportsList = logTransports.map((transport) => {
      switch (transport) {
        case LogTransport.CONSOLE:
          return new transports.Console({
            format: format.combine(...formatters, format.colorize()),
          });
        case LogTransport.DAILY_ROTATE_FILE:
          return new transports.DailyRotateFile({
            dirname: this.options.logDir || 'logs',
            filename: `%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            format: format.combine(...formatters),
            maxFiles: '14d',
          });
        default:
          return new transports.Console({
            format: format.combine(...formatters, format.colorize()),
          });
      }
    });

    this.logger = createLogger({
      level,
      format: format.combine(...formatters),
      defaultMeta: {
        service: this.options.appName,
      },
      transports: transportsList,
    });
  }

  /**
   * Set the context for the logger
   * @param context The context name
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * Log a message
   * @param message The message to log
   * @param args Additional arguments
   */
  log(message: string, ...args: any[]) {
    this.logger.info(this.formatMessage(message), ...args);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param trace Optional stack trace
   * @param args Additional arguments
   */
  error(message: string, trace?: string, ...args: any[]) {
    this.logger.error(this.formatMessage(message), { trace, ...args });
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Additional arguments
   */
  warn(message: string, ...args: any[]) {
    this.logger.warn(this.formatMessage(message), ...args);
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param args Additional arguments
   */
  debug(message: string, ...args: any[]) {
    this.logger.debug(this.formatMessage(message), ...args);
  }

  /**
   * Log a verbose message
   * @param message The message to log
   * @param args Additional arguments
   */
  verbose(message: string, ...args: any[]) {
    this.logger.verbose(this.formatMessage(message), ...args);
  }

  private formatMessage(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }
} 