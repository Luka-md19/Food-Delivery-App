import { Injectable } from '@nestjs/common';
import { BaseJwtPayload, JwtStrategyBase } from '@app/common/auth/strategies';
import { AppConfigService, Jwtpayload } from '@app/common';

/**
 * Auth service implementation of the JwtStrategy
 * Customizes the validation behavior specific to the auth service
 */
@Injectable()
export class JwtStrategy extends JwtStrategyBase {
  constructor(configService: AppConfigService) {
    super(configService);
  }

  /**
   * Override the base validate method to return the specific Jwtpayload type
   * which is needed for the auth service
   */
  override async validate(payload: Jwtpayload): Promise<Jwtpayload> {
    // Call the parent validation to ensure basic payload structure is valid
    await super.validate(payload);
    
    // Return the payload with the specific Jwtpayload type
    return payload;
  }
}
