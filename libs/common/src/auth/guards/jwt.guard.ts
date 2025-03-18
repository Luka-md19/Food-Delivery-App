// libs/common/src/guards/jwt.guard.ts
import { Injectable, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

      try {
        const decoded = this.jwtService.verify(token);
        request.user = decoded;
        return true;
      } catch (error) {
        this.logger.warn(`JWT verification failed: ${error.message}`);
        
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Invalid token signature');
        } else {
          throw new UnauthorizedException('Invalid token');
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Unexpected error in JWT guard: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Authentication system error');
    }
  }
}
