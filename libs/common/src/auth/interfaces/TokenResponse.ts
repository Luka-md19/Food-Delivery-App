import { UserRole } from "./UserRole";

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    user?: {
        id: string;
        email: string;
        roles: UserRole[];
    }
}
