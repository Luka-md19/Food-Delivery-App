import { UserRole } from "./UserRole";
import { BaseJwtPayload } from "../strategies/jwt.strategy.base";

/**
 * Standard JWT payload format for authentication
 * Extends the base JWT payload with additional type safety
 */
export interface Jwtpayload extends BaseJwtPayload {
    userId: string;
    email: string;
    roles: UserRole[];
    iat?: number;
    exp?: number;
}