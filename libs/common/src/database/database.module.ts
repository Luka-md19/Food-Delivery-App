// libs/common/src/database/database.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, AppConfigService } from '../config';
import { DatabaseService } from './database.service';
import { LoggerFactory } from '../logger/logger.factory';

@Module({})
export class DatabaseModule {
  /**
   * Initializes the main TypeORM connection.
   * This should only be called once (in your root module).
   */
  static forRoot(connectionName: string, entities: Function[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [AppConfigService],
          useFactory: async (configService: AppConfigService) => {
            const logger = LoggerFactory.getLogger('DatabaseModule');
            const prefix = connectionName.toUpperCase();
            const host = configService.get(
              `${prefix}_DATABASE_HOST`,
              configService.get('DATABASE_HOST')
            );
            const port = Number(
              configService.get(`${prefix}_DATABASE_PORT`, configService.get('DATABASE_PORT'))
            );
            const user = configService.get(
              `${prefix}_DATABASE_USER`,
              configService.get('DATABASE_USER')
            );
            const password = configService.get(
              `${prefix}_DATABASE_PASSWORD`,
              configService.get('DATABASE_PASSWORD')
            );
            const dbName = configService.get(
              `${prefix}_DATABASE_NAME`,
              configService.get('DATABASE_NAME')
            );
  
            // Add debug logs (avoid logging sensitive info in production)
            logger.debug("Database Connection Options:");
            logger.debug(`Host: ${host}`);
            logger.debug(`Port: ${port}`);
            logger.debug(`Username: ${user}`);
            logger.debug(`Database Name: ${dbName}`);
  
            return {
              type: 'postgres',
              host,
              port,
              username: user,
              password,
              database: dbName,
              entities,
              synchronize: configService.get<boolean>(`${prefix}_DATABASE_SYNC`, false),
              logging: configService.get<boolean>(`${prefix}_DATABASE_LOGGING`, false),
              autoLoadEntities: true,
            };
          },
        }),
      ],
      providers: [DatabaseService],
      exports: [DatabaseService],
    };
  }

  /**
   * Use this method in feature modules to inject repositories without initializing a new connection.
   */
  static forFeature(entities: Function[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(entities)],
      exports: [TypeOrmModule],
    };
  }
}
