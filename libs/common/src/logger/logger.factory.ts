import { LogFormat, LogLevel, LogTransport } from './constants';
import { LoggerModuleOptions } from './interfaces';
import { LoggerService } from './logger.service';

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
} 