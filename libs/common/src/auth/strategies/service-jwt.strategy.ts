import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '@app/common/config/config.service';
import { ServiceJwtPayload } from '../interfaces/service-jwt-payload.interface';

@Injectable()
export class ServiceJwtStrategy extends PassportStrategy(Strategy, 'service-jwt') {
  constructor(private readonly configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: ServiceJwtPayload): Promise<ServiceJwtPayload> {
    if (!payload.serviceId || !payload.serviceName || !payload.permissions) {
      throw new UnauthorizedException('Invalid service token');
    }
    
    return {
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      permissions: payload.permissions,
    };
  }
} 