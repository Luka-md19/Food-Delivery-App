import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../services/health-check.service';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

/**
 * Controller for health check endpoints
 * These endpoints are used by Kubernetes for liveness and readiness probes
 */
@ApiTags('health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthCheckService: HealthCheckService,
    @Inject('SERVICE_NAME') private readonly serviceName: string,
    @Inject('INSTANCE_ID') private readonly instanceId: string,
    @Inject('HOSTNAME') private readonly hostname: string,
    @Inject('HEALTH_PATH') private readonly path: string,
  ) {}

  /**
   * Main health check endpoint
   * Used for general service health status
   */
  @Get(`:path`)
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy or degraded' })
  async healthCheck(): Promise<HealthCheckResult> {
    this.logger.debug(`Health check requested for ${this.serviceName} (${this.instanceId})`);
    const result = await this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
    
    if (result.status === 'down') {
      this.logger.error(`Service is unhealthy: ${JSON.stringify(result)}`);
    } else if (result.status === 'degraded') {
      this.logger.warn(`Service is degraded: ${JSON.stringify(result)}`);
    }
    
    return result;
  }

  /**
   * Liveness probe endpoint for Kubernetes
   * A successful response indicates the service is running and not deadlocked
   */
  @Get(`:path/liveness`)
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  async livenessProbe(): Promise<{ status: string; instanceId: string }> {
    // For liveness, we just need to know if the service is responding
    // We don't check dependencies since Kubernetes will restart if this fails
    return {
      status: 'alive',
      instanceId: this.instanceId,
    };
  }

  /**
   * Readiness probe endpoint for Kubernetes
   * A successful response indicates the service is ready to accept traffic
   */
  @Get(`:path/readiness`)
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready to accept traffic' })
  async readinessProbe(): Promise<HealthCheckResult> {
    this.logger.debug(`Readiness check requested for ${this.serviceName} (${this.instanceId})`);
    
    // For readiness, we need to check all dependencies
    // If any critical dependency is down, we should return a non-200 status
    const result = await this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
    
    if (result.status === 'down') {
      this.logger.warn(`Service is not ready: ${JSON.stringify(result)}`);
    }
    
    return result;
  }
  
  /**
   * Startup probe endpoint for Kubernetes
   * A successful response indicates the service has started up properly
   */
  @Get(`:path/startup`)
  @ApiOperation({ summary: 'Kubernetes startup probe' })
  @ApiResponse({ status: 200, description: 'Service has started properly' })
  @ApiResponse({ status: 503, description: 'Service has not started properly' })
  async startupProbe(): Promise<HealthCheckResult> {
    this.logger.debug(`Startup check requested for ${this.serviceName} (${this.instanceId})`);
    
    // For startup, we need to check all dependencies
    // This is similar to readiness but used during initial container startup
    const result = await this.healthCheckService.check(this.serviceName, this.instanceId, this.hostname);
    
    return result;
  }
} 