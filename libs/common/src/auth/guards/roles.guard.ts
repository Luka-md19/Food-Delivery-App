import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../interfaces/UserRole";
import { Jwtpayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<UserRole[]>(
            'roles',
            context.getHandler()
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
