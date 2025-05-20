import { Controller, Get, Inject, Param, All } from '@nestjs/common';
import { SkipRateLimit } from '@app/common/rate-limiter';
import { HealthCheckService } from '@app/common/health';
import { HealthCheckResult } from '@app/common/health/interfaces/health-check-result.interface';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Health controller for the auth service
 * This follows the Single Responsibility Principle by focusing on health monitoring
 */
@ApiTags('Health')
@Controller('health')
@SkipRateLimit()
export class AuthHealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    @Inject('SERVICE_NAME') private readonly serviceName: string,
    @Inject('INSTANCE_ID') private readonly instanceId: string,
    @Inject('HOSTNAME') private readonly hostname: string
  ) {}

  /**
   * Main health check endpoint
   * Used for general service health status
   */
  @Get()
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy or degraded' })
  async healthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
  }

  /**
   * Liveness probe endpoint for Kubernetes
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
   * Readiness probe endpoint for Kubernetes
   */
  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readinessProbe(): Promise<HealthCheckResult> {
    return this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
  }

  /**
   * Wildcard route for health check related endpoints
   * This uses the new named parameter format
   */
  @All('*path')
  @ApiOperation({ summary: 'Catch all health-related requests' })
  @ApiResponse({ status: 200, description: 'Handled health request' })
  async catchAllHealthRequests(@Param('path') path: string): Promise<{ status: string; path: string }> {
    return {
      status: 'ok',
      path: path || 'root',
    };
  }
} 