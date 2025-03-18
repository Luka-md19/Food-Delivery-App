import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * Abstract health controller that can be extended by microservices
 * This follows the Open/Closed Principle by being open for extension but closed for modification
 */
@ApiTags('health')
@Controller('health')
export abstract class HealthController {
  private readonly logger = LoggerFactory.getLogger(this.constructor.name);
  
  constructor(
    protected readonly healthCheckService: HealthCheckService,
    protected readonly serviceName: string
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({
    status: 200,
    description: 'Service health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time', example: '2023-03-13T19:26:00.000Z' },
        service: { type: 'string', example: 'service-name' },
        version: { type: 'string', example: '1.0.0' },
        port: { type: 'number', example: 3000 },
        environment: { type: 'string', example: 'production' },
        dependencies: {
          type: 'object',
          properties: {
            rabbitmq: { type: 'string', example: 'connected' },
            database: { type: 'string', example: 'connected' },
            redis: { type: 'string', example: 'connected' }
          }
        }
      }
    }
  })
  async check(): Promise<HealthCheckResult> {
    this.logger.log('Performing health check');
    return this.healthCheckService.check(this.serviceName);
  }
} 