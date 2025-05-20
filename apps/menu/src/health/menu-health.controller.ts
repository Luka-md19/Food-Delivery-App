import { Controller, Get, Inject } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheckResult 
} from '@app/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for Menu service health check endpoints
 */
@ApiTags('health')
@Controller('health')
export class MenuHealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    @Inject('SERVICE_NAME') private readonly serviceName: string,
    @Inject('INSTANCE_ID') private readonly instanceId: string,
    @Inject('HOSTNAME') private readonly hostname: string,
  ) {}

  /**
   * General health check endpoint
   */
  @Get()
  @ApiOperation({ summary: 'Get menu service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy or degraded' })
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
  }

  /**
   * Liveness probe for Kubernetes
   */
  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessProbe(): Promise<{ status: string; instanceId: string }> {
    return {
      status: 'alive',
      instanceId: this.instanceId,
    };
  }

  /**
   * Readiness probe for Kubernetes
   */
  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready to accept traffic' })
  async readinessProbe(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
    
    // Return proper status code based on health check result
    return result;
  }

  /**
   * Startup probe for Kubernetes
   */
  @Get('startup')
  @ApiOperation({ summary: 'Kubernetes startup probe' })
  @ApiResponse({ status: 200, description: 'Service has started successfully' })
  @ApiResponse({ status: 503, description: 'Service has not started properly' })
  async startupProbe(): Promise<HealthCheckResult> {
    return this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
  }
} 