// libs/common/src/config/config.module.ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppConfigService } from './config.service';
import databaseConfig from './database.config';
import mongodbConfig from './mongodb.config';

@Global()
@Module({})
export class ConfigModule {
  static forRoot(service: string): DynamicModule {
    return {
      module: ConfigModule,
      imports: [
        NestConfigModule.forRoot({
          envFilePath: [
            '.env',                // Root .env with shared variables (lowest precedence)
            `.env.${process.env.NODE_ENV || 'development'}`, // Environment-specific variables
            `apps/${service}/.env` // Service-specific variables (highest precedence)
          ],
          load: [databaseConfig, mongodbConfig],
          isGlobal: true,
          validationSchema: Joi.object({
            NODE_ENV: Joi.string().default('development'),
            PORT: Joi.number().default(3000),
            
            // Optional PostgreSQL config (for auth service)
            DATABASE_HOST: Joi.string().optional(),
            DATABASE_PORT: Joi.number().optional(),
            DATABASE_USER: Joi.string().optional(),
            DATABASE_PASSWORD: Joi.string().optional(),
            DATABASE_NAME: Joi.string().optional(),
            DATABASE_SYNC: Joi.string().optional(),
            DATABASE_AUTOLOAD: Joi.string().optional(),
            DATABASE_LOGGING: Joi.string().optional(),
            
            // Database connection pooling configuration
            DATABASE_POOL_SIZE: Joi.number().optional().default(10),
            DATABASE_MAX_POOL_SIZE: Joi.number().optional().default(20),
            DATABASE_CONNECTION_TIMEOUT: Joi.number().optional().default(10000),
            DATABASE_IDLE_TIMEOUT: Joi.number().optional().default(30000),
            DATABASE_QUERY_TIMEOUT: Joi.number().optional().default(30000),
            DATABASE_SSL_ENABLED: Joi.boolean().optional().default(false),
            
            // JWT Configuration (shared across services)
            JWT_SECRET: Joi.string().required(),
            JWT_EXPIRATION: Joi.string().default('1h'),
            REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
            
            // MongoDB Configuration (for menu service)
            MONGODB_URI: Joi.string().optional(),
            MONGODB_DATABASE: Joi.string().optional(),
            MONGODB_MAX_POOL_SIZE: Joi.number().optional(),
            MONGODB_CONNECT_TIMEOUT: Joi.number().optional(),
            MONGODB_SOCKET_TIMEOUT: Joi.number().optional(),
            MONGODB_SSL_ENABLED: Joi.boolean().optional(),
            
            // Service Authentication
            SERVICE_ID: Joi.string().optional(),
            SERVICE_NAME: Joi.string().optional(),
            SERVICE_API_KEY: Joi.string().optional(),
            SERVICE_API_KEYS: Joi.string().optional(),
            SERVICE_PERMISSIONS: Joi.string().optional(),
            AUTH_SERVICE_URL: Joi.string().optional(),
          }),
        }),
      ],
      providers: [AppConfigService],
      exports: [AppConfigService],
    };
  }
}