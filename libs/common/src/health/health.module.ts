import { DynamicModule, Module } from '@nestjs/common';
import { HealthCheckService } from './services/health-check.service';
import { ConfigModule } from '../config';
import { HealthController } from './controllers/health.controller';

/**
 * Health check module options interface
 */
export interface HealthModuleOptions {
  /** Service name for identification */
  serviceName: string;
  
  /** Instance ID for tracking in distributed environments */
  instanceId?: string;
  
  /** Hostname for this instance */
  hostname?: string;
  
  /** 
   * Whether to automatically register health check controller
   * @default true
   */
  registerController?: boolean;
  
  /**
   * Custom health check path prefix
   * @default 'health'
   */
  path?: string;
}

/**
 * Health module that can be imported by microservices
 * This follows the Dependency Inversion Principle by depending on abstractions
 */
@Module({})
export class HealthModule {
  /**
   * Register the health module for a specific service
   * @param options Configuration options
   * @returns Dynamic module
   */
  static register(options: HealthModuleOptions): DynamicModule {
    const {
      serviceName,
      instanceId,
      hostname,
      registerController = true,
      path = 'health',
    } = options;

    const providers = [
      HealthCheckService,
      {
        provide: 'SERVICE_NAME',
        useValue: serviceName,
      },
      {
        provide: 'INSTANCE_ID',
        useValue: instanceId || `${serviceName}-${Date.now()}`,
      },
      {
        provide: 'HOSTNAME',
        useValue: hostname || 'localhost',
      },
      {
        provide: 'HEALTH_PATH',
        useValue: path,
      },
    ];

    const controllers = registerController ? [HealthController] : [];

    return {
      module: HealthModule,
      imports: [ConfigModule],
      controllers,
      providers,
      exports: [HealthCheckService],
    };
  }
} 