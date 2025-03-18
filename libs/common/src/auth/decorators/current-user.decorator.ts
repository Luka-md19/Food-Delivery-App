import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Jwtpayload } from "../interfaces/jwt-payload.interface";
import { LoggerFactory } from "../../logger/logger.factory";

export const CurrentUser = createParamDecorator(
    (data: keyof Jwtpayload | undefined, context: ExecutionContext) => {
        const logger = LoggerFactory.getLogger('CurrentUser');
        const request = context.switchToHttp().getRequest();
        const user = request.user as Jwtpayload;
        if (!user) {
            logger.error('No user found in request');
            return null;
        }

        return data ? user?.[data] : user;
    }
)