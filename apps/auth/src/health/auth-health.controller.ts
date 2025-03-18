import { Controller } from '@nestjs/common';
import { SkipRateLimit } from '@app/common/rate-limiter';
import { HealthController, HealthCheckService } from '@app/common/health';

/**
 * Health controller for the auth service
 * This follows the Liskov Substitution Principle by extending the base health controller
 */
@Controller('health')
@SkipRateLimit()
export class AuthHealthController extends HealthController {
  constructor(healthCheckService: HealthCheckService) {
    super(healthCheckService, 'auth-service');
  }
} 