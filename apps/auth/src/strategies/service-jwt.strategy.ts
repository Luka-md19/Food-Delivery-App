import { Injectable } from '@nestjs/common';
import { ServiceJwtStrategy as CommonServiceJwtStrategy } from '@app/common/auth/strategies';
import { AppConfigService } from '@app/common';
import { PassportStrategy } from '@nestjs/passport';

/**
 * Auth service implementation of the ServiceJwtStrategy
 * Extends the common implementation to provide auth-specific functionality if needed
 */
@Injectable()
export class ServiceJwtStrategy extends CommonServiceJwtStrategy {
  constructor(configService: AppConfigService) {
    super(configService);
  }
} 