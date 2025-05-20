import { Injectable, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServiceJwtPayload } from '../interfaces/service-jwt-payload.interface';

@Injectable()
export class ServiceJwtAuthGuard extends AuthGuard('service-jwt') {
  private readonly logger = new Logger(ServiceJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First call the parent canActivate to validate JWT token
    const canActivate = await super.canActivate(context);
    
    if (!canActivate) {
      return false;
    }
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization Header');
    }

    try {
      // Check if the token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Attempt to use blacklisted service token: ${token.substring(0, 10)}...`);
        throw new UnauthorizedException('Service token has been revoked');
      }

      // Verify it's a service token
      const decoded = this.jwtService.decode(token) as ServiceJwtPayload;
      if (!decoded || !decoded.serviceId || !decoded.serviceName) {
        this.logger.warn('Invalid service token structure');
        throw new UnauthorizedException('Invalid service token');
      }
      
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Unexpected error in Service JWT guard: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Service authentication system error');
    }
  }

  // Override handleRequest to customize error handling
  handleRequest(err, user, info, context) {
    // You can add additional error handling or logging here
    if (err || !user || !user.serviceId) {
      if (err) {
        this.logger.warn(`Service JWT validation error: ${err.message}`);
      } else if (!user) {
        this.logger.warn('No service found from JWT token');
      } else if (!user.serviceId) {
        this.logger.warn('Invalid service token - missing serviceId');
      }
      throw err || new UnauthorizedException('Service authentication failed');
    }
    
    return user;
  }
} 