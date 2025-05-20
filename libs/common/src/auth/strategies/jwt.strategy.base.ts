import { AppConfigService } from '@app/common/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Base JWT payload interface
 */
export interface BaseJwtPayload {
  userId: string;
  email: string;
  roles?: string[];
  [key: string]: any;
}

/**
 * Base JWT strategy that can be extended by service-specific implementations
 * Handles token extraction and validation
 */
@Injectable()
export class JwtStrategyBase extends PassportStrategy(Strategy) {
  constructor(protected configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validates the JWT payload and returns a user object
   * @param payload The decoded JWT payload
   * @returns User information extracted from the token
   */
  async validate(payload: BaseJwtPayload): Promise<BaseJwtPayload> {
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return the standard user object
    return {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
      ...payload
    };
  }
} 