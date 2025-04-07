// libs/common/src/swagger/swagger.service.ts
import { INestApplication } from "@nestjs/common";
import { SwaggerConfig } from "./interfaces/swagger-config.interface";
import { swaggerDefaultConfig } from "./config/swagger.config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { SWAGGER_API_AUTH_NAME } from "./constants/swagger.constants";

export class Swaggerservice {
    static setup(
        app: INestApplication,
        config: Partial<SwaggerConfig> = {}
    ): void {
        const finalConfig: SwaggerConfig = {
            ...swaggerDefaultConfig,
            ...config,
        };

        const builder = new DocumentBuilder()
            .setTitle(finalConfig.title)
            .setDescription(finalConfig.description)
            .setVersion(finalConfig.version)
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'Authorization',
                    in: 'header',
                    description: 'Enter your JWT token here',
                },
                SWAGGER_API_AUTH_NAME,
            );

        if (finalConfig.tags) {
            finalConfig.tags.forEach((tag) => builder.addTag(tag));
        }

        const document = SwaggerModule.createDocument(app, builder.build());
        
        // Configure security requirements for Swagger UI
        document.security = [{
            [SWAGGER_API_AUTH_NAME]: [],
        }];

        SwaggerModule.setup(finalConfig.apiPath, app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                authAction: {
                    [SWAGGER_API_AUTH_NAME]: {
                        name: SWAGGER_API_AUTH_NAME,
                        schema: {
                            type: 'http',
                            in: 'header',
                            name: 'Authorization',
                            bearerFormat: 'JWT',
                            scheme: 'bearer',
                        },
                        value: '',
                    },
                },
            },
        });
    }
}