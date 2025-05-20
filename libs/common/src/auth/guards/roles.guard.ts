import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../interfaces/UserRole";
import { Jwtpayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

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
        const requiredRoles = this.getMetadata<UserRole[]>(
            'roles',
            [context.getHandler(), context.getClass()]
        );
        
        if (!requiredRoles) {
            return true; 
        }
        
        const request = context.switchToHttp().getRequest();
        const user = request.user as Jwtpayload;

        const hasRequiredRole = requiredRoles.some((role) =>
            user.roles.includes(role)
        );
        
        if (!hasRequiredRole) {
            throw new ForbiddenException(
                `User role ${user.roles} is not authorized to access this endpoint.`
            );
        }
        
        return true; 
    }
}
