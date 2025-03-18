import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { SWAGGER_API_AUTH_NAME } from "../constants/swagger.constants";

export function ApiAuth(){
    return applyDecorators(
        ApiBearerAuth(SWAGGER_API_AUTH_NAME),
        ApiUnauthorizedResponse({description: 'Unauthorized'})
    );

}