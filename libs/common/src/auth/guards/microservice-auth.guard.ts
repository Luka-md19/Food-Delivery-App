import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ServiceJwtPayload } from '../interfaces/service-jwt-payload.interface';
import { Reflector } from '@nestjs/core';
import { SERVICE_PERMISSIONS_KEY } from '../decorators/service-permissions.decorator';

/**
 * Guard for authenticating microservice-to-microservice communication
 */
@Injectable()
export class MicroserviceAuthGuard implements CanActivate {
  private readonly logger = new Logger(MicroserviceAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Helper function to safely get metadata using the reflector
   * This is a workaround for the reflector.getAllAndOverride issue
   */
  private getMetadata<T>(key: string, targets: any[]): T | undefined {
    for (const target of targets) {
      const metadata = this.reflector.get<T>(key, target);
      if (metadata !== undefined) {
        return metadata;
      }
    }
    return undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'rpc') {
      this.logger.warn('MicroserviceAuthGuard should only be used on RPC contexts');
      return true; // Skip for non-RPC contexts
    }

    const rpcContext = context.switchToRpc();
    const metadata = rpcContext.getContext<Record<string, any>>();

    // Check if authorization header exists
    if (!metadata || !metadata.authorization) {
      this.logger.warn('Missing authorization metadata in microservice request');
      throw new UnauthorizedException('Missing service authorization');
    }

    // Extract the token
    const [bearer, token] = metadata.authorization.split(' ');
    if (bearer !== 'Bearer' || !token) {
      this.logger.warn('Invalid authorization format in microservice request');
      throw new UnauthorizedException('Invalid service authorization format');
    }

    try {
      // Verify and decode the token
      const decodedToken = this.jwtService.verify<ServiceJwtPayload>(token);
      
      // Validate service token structure
      if (!decodedToken.serviceId || !decodedToken.serviceName || !decodedToken.permissions) {
        this.logger.warn('Invalid service token structure in microservice request');
        throw new UnauthorizedException('Invalid service token');
      }
      
      // Store the service info in request context for later use
      metadata.service = decodedToken;
      
      // Check for required permissions
      const requiredPermissions = this.getMetadata<string[]>(
        SERVICE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()]
      );
      
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some((perm: string) => 
          decodedToken.permissions.includes(perm)
        );
        
        if (!hasPermission) {
          this.logger.warn(
            `Service ${decodedToken.serviceName} lacks required permissions: ${requiredPermissions.join(', ')}`
          );
          throw new UnauthorizedException(
            `Service ${decodedToken.serviceName} doesn't have required permissions`
          );
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Microservice authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Service authentication failed');
    }
  }
} 