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
          envFilePath: `apps/${service}/.env`,
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
            
            // JWT Configuration (shared across services)
            JWT_SECRET: Joi.string().required(),
            JWT_EXPIRATION: Joi.string().default('15m'),
            REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
            
            // Optional MongoDB Configuration (for menu service)
            MONGODB_URI: Joi.string().optional(),
            MONGODB_DATABASE: Joi.string().optional(),
            MONGODB_MAX_POOL_SIZE: Joi.number().optional(),
            MONGODB_CONNECT_TIMEOUT: Joi.number().optional(),
            MONGODB_SOCKET_TIMEOUT: Joi.number().optional(),
          }),
        }),
      ],
      providers: [AppConfigService],
      exports: [AppConfigService, NestConfigModule],
    };
  }
}