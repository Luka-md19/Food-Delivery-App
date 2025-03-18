import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../interfaces/UserRole";

export const Roles = (...roles: UserRole[]) => 
    SetMetadata('roles', roles);