import { UserRole } from "./UserRole";

export interface TokenResponse {
    accessToken : string;
    refreshToken : string;
    user:{
        id: string;
        email: string;
        roles: UserRole[];
    }
}
