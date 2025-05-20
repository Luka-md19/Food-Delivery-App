import { LogFormat, LogLevel, LogTransport } from './constants';
import { LoggerModuleOptions } from './interfaces';
import { LoggerService } from './logger.service';
import { LoggerService as NestLoggerService } from '@nestjs/common';

const defaultOptions: LoggerModuleOptions = {
  appName: 'app',
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  format: process.env.NODE_ENV === 'production' ? LogFormat.JSON : LogFormat.TEXT,
  transports: [LogTransport.CONSOLE],
  timestamp: true,
  trackRequestId: true,
  trackUserId: true,
  redactSensitiveData: true,
};

export class LoggerFactory {
  private static instance: LoggerService | null = null;

  static getLogger(context?: string): LoggerService {
    if (!this.instance) {
      this.instance = new LoggerService(defaultOptions);
    }
    return context ? this.instance.setContext(context) : this.instance;
  }
  
  /**
   * Get a NestJS compatible logger for use with NestFactory.create()
   * This integrates our custom logger with the NestJS framework's logging system
   */
  static getNestLogger(): NestLoggerService {
    const logger = this.getLogger('NestJS');
    
    return {
      log: (message: any, ...optionalParams: any[]) => 
        logger.log(message, ...optionalParams),
      error: (message: any, ...optionalParams: any[]) => 
        logger.error(message, optionalParams[0], ...optionalParams.slice(1)),
      warn: (message: any, ...optionalParams: any[]) => 
        logger.warn(message, ...optionalParams),
      debug: (message: any, ...optionalParams: any[]) => 
        logger.debug(message, ...optionalParams),
      verbose: (message: any, ...optionalParams: any[]) => 
        logger.verbose(message, ...optionalParams),
    };
  }
} 