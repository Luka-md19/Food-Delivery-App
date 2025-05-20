import { Injectable } from '@nestjs/common';
import { BaseJwtPayload, JwtStrategyBase } from '@app/common/auth/strategies';
import { AppConfigService, Jwtpayload } from '@app/common';

/**
 * Menu service implementation of the JwtStrategy
 * Extends the common base implementation with service-specific logic
 */
@Injectable()
export class JwtStrategy extends JwtStrategyBase {
  constructor(configService: AppConfigService) {
    super(configService);
  }
  
  /**
   * Override the base validate method to customize for menu service
   * Maps the userId to id for compatibility with menu service components
   */
  override async validate(payload: BaseJwtPayload): Promise<any> {
    // Validate basic payload structure
    await super.validate(payload);
    
    // Return user object with the format expected by the menu service
    return {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles || []
    };
  }
} 