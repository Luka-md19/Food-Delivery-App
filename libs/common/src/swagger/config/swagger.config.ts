import { SWAGGER_API_CURRENT_VERSION, SWAGGER_API_DESCRIPTION, SWAGGER_API_NAME, SWAGGER_API_ROOT } from "../constants/swagger.constants";
import { SwaggerConfig } from "../interfaces/swagger-config.interface";

export const swaggerDefaultConfig : SwaggerConfig  = {
    title: SWAGGER_API_NAME,
    description: SWAGGER_API_DESCRIPTION,
    version: SWAGGER_API_CURRENT_VERSION,
    apiPath: SWAGGER_API_ROOT
}