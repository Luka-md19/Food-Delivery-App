// libs/common/src/guards/jwt.guard.ts
import { Injectable, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

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
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Attempt to use blacklisted token: ${token.substring(0, 10)}...`);
        throw new UnauthorizedException('Token has been revoked');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Unexpected error in JWT guard: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Authentication system error');
    }
  }

  // Override handleRequest to customize error handling
  handleRequest(err, user, info, context) {
    // Check if this is a Swagger UI request
    const req = context.switchToHttp().getRequest();
    const isSwaggerRequest = req.url && (
      req.url.includes('/docs') || 
      req.url.includes('/api-json') ||
      req.headers['x-swagger-ui'] === 'true'
    );

    // If it's a Swagger request and no user, allow it for documentation
    if (isSwaggerRequest && !user) {
      this.logger.debug('Swagger UI request detected - bypassing authentication');
      return { userId: 'swagger-ui', roles: [] };
    }

    // You can add additional error handling or logging here
    if (err || !user) {
      if (err) {
        this.logger.warn(`JWT validation error: ${err.message}`);
      } else if (!user) {
        this.logger.warn('No user found from JWT token');
      }
      throw err || new UnauthorizedException('Authentication failed');
    }
    
    return user;
  }
}
