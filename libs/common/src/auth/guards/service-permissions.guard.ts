import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ServiceJwtPayload } from "../interfaces/service-jwt-payload.interface";
import { SERVICE_PERMISSIONS_KEY } from "../decorators/service-permissions.decorator";

@Injectable()
export class ServicePermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

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

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.getMetadata<string[]>(
            SERVICE_PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()]
        );
        
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; 
        }
        
        const request = context.switchToHttp().getRequest();
        const service = request.user as ServiceJwtPayload;

        if (!service || !service.serviceId || !service.permissions || !Array.isArray(service.permissions)) {
            throw new ForbiddenException('Invalid service token structure');
        }

        const hasRequiredPermission = requiredPermissions.some((permission: string) =>
            service.permissions.includes(permission)
        );
        
        if (!hasRequiredPermission) {
            throw new ForbiddenException(
                `Service ${service.serviceName} doesn't have the required permissions to access this endpoint`
            );
        }
        
        return true; 
    }
} 