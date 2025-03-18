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
                },
                SWAGGER_API_AUTH_NAME,
            );

        if (finalConfig.tags) {
            finalConfig.tags.forEach((tag) => builder.addTag(tag));
        }

        const document = SwaggerModule.createDocument(app, builder.build());
        SwaggerModule.setup(finalConfig.apiPath, app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }
}