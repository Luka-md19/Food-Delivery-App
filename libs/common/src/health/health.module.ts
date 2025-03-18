import { DynamicModule, Module } from '@nestjs/common';
import { HealthCheckService } from './services/health-check.service';
import { ConfigModule } from '../config';

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
  static register(options: { serviceName: string }): DynamicModule {
    return {
      module: HealthModule,
      imports: [ConfigModule],
      providers: [
        HealthCheckService,
        {
          provide: 'SERVICE_NAME',
          useValue: options.serviceName,
        },
      ],
      exports: [HealthCheckService],
    };
  }
} 