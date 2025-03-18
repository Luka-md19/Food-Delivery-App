import { UserRole } from "./UserRole";

export interface Jwtpayload {
    userId:string;
    email:string;
    roles:UserRole[];
    iat?:number;
    exp?:number;
}