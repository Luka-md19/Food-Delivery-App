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
            
            // Retrieve database configuration with proper prefix handling
            const prefix = connectionName ? `${connectionName}_` : '';
            
            // Get values with fallbacks
            const host = configService.get(`${prefix}DATABASE_HOST`) || 
                         configService.get('DATABASE_HOST', 'localhost');
            const port = Number(configService.get(`${prefix}DATABASE_PORT`)) || 
                         Number(configService.get('DATABASE_PORT', 5432));
            const username = configService.get(`${prefix}DATABASE_USER`) || 
                            configService.get('DATABASE_USER', 'postgres');
            const password = configService.get(`${prefix}DATABASE_PASSWORD`) || 
                            configService.get('DATABASE_PASSWORD');
            const database = configService.get(`${prefix}DATABASE_NAME`) || 
                            configService.get('DATABASE_NAME', 'postgres');
            
            // Log configuration values but mask sensitive info
            logger.debug(`Config: DATABASE_HOST = ${host}`);
            logger.debug(`Config: ${prefix}DATABASE_HOST = ${host}`);
            logger.debug(`Config: DATABASE_PORT = ${port}`);
            logger.debug(`Config: ${prefix}DATABASE_PORT = ${port}`);
            logger.debug(`Config: DATABASE_USER = ${username}`);
            logger.debug(`Config: ${prefix}DATABASE_USER = ${username}`);
            
            // Always mask passwords
            logger.debug(`Config: DATABASE_PASSWORD = [MASKED]`);
            logger.debug(`Config: ${prefix}DATABASE_PASSWORD = [MASKED]`);
            
            logger.debug(`Config: DATABASE_NAME = ${database}`);
            logger.debug(`Config: ${prefix}DATABASE_NAME = ${database}`);
            
            // Log database connection options (but mask the password)
            logger.debug('Database Connection Options:');
            logger.debug(`Host: ${host}`);
            logger.debug(`Port: ${port}`);
            logger.debug(`Username: ${username}`);
            logger.debug(`Database Name: ${database}`);
            
            // Handle pool configuration
            const poolSize = Number(configService.get(`${prefix}DATABASE_POOL_SIZE`)) || 
                            Number(configService.get('DATABASE_POOL_SIZE', 10));
            const maxPoolSize = Number(configService.get(`${prefix}DATABASE_MAX_POOL_SIZE`)) || 
                               Number(configService.get('DATABASE_MAX_POOL_SIZE', 20));
            const connectionTimeout = Number(configService.get(`${prefix}DATABASE_CONNECTION_TIMEOUT`)) || 
                                     Number(configService.get('DATABASE_CONNECTION_TIMEOUT', 5000));
            const idleTimeout = Number(configService.get(`${prefix}DATABASE_IDLE_TIMEOUT`)) || 
                               Number(configService.get('DATABASE_IDLE_TIMEOUT', 30000));
            
            logger.debug(`Config: DATABASE_POOL_SIZE = ${poolSize}`);
            logger.debug(`Config: ${prefix}DATABASE_POOL_SIZE = ${poolSize}`);
            logger.debug(`Config: DATABASE_MAX_POOL_SIZE = ${maxPoolSize}`);
            logger.debug(`Config: ${prefix}DATABASE_MAX_POOL_SIZE = ${maxPoolSize}`);
            logger.debug(`Config: DATABASE_CONNECTION_TIMEOUT = ${connectionTimeout}`);
            logger.debug(`Config: ${prefix}DATABASE_CONNECTION_TIMEOUT = ${connectionTimeout}`);
            logger.debug(`Config: DATABASE_IDLE_TIMEOUT = ${idleTimeout}`);
            logger.debug(`Config: ${prefix}DATABASE_IDLE_TIMEOUT = ${idleTimeout}`);
            
            logger.debug('Pool configuration:');
            logger.debug(`Initial Pool Size: ${poolSize}`);
            logger.debug(`Max Pool Size: ${maxPoolSize}`);
            logger.debug(`Connection Timeout: ${connectionTimeout}ms`);
            logger.debug(`Idle Timeout: ${idleTimeout}ms`);
            
            // Handle sync options
            const syncValue = configService.get(`${prefix}DATABASE_SYNC`, true);
            const sync = typeof syncValue === 'string' ? syncValue === 'true' : Boolean(syncValue);
            
            const dropBeforeSyncValue = configService.get(`${prefix}DATABASE_DROP_BEFORE_SYNC`, false);
            const dropBeforeSync = typeof dropBeforeSyncValue === 'string' ? dropBeforeSyncValue === 'true' : Boolean(dropBeforeSyncValue);
            
            logger.debug(`Config: ${prefix}DATABASE_SYNC = ${sync}`);
            logger.debug(`Config: ${prefix}DATABASE_DROP_BEFORE_SYNC = ${dropBeforeSync}`);
            logger.debug(`Database synchronize: ${sync}`);
            logger.debug(`Database drop before sync: ${dropBeforeSync}`);
            
            // Handle logging options
            const logging = configService.get(`${prefix}DATABASE_LOGGING`);
            logger.debug(`Config: ${prefix}DATABASE_LOGGING = ${logging}`);
            
            // Query timeout
            const queryTimeout = Number(configService.get(`${prefix}DATABASE_QUERY_TIMEOUT`)) || 
                                Number(configService.get('DATABASE_QUERY_TIMEOUT', 30000));
            logger.debug(`Config: DATABASE_QUERY_TIMEOUT = ${queryTimeout}`);
            logger.debug(`Config: ${prefix}DATABASE_QUERY_TIMEOUT = ${queryTimeout}`);
            
            // Handle SSL options
            const sslEnabledValue = configService.get(`${prefix}DATABASE_SSL_ENABLED`) || 
                                   configService.get('DATABASE_SSL_ENABLED');
            const sslEnabled = typeof sslEnabledValue === 'string' ? sslEnabledValue === 'true' : Boolean(sslEnabledValue);
            logger.debug(`Config: DATABASE_SSL_ENABLED = ${sslEnabled}`);
            logger.debug(`Config: ${prefix}DATABASE_SSL_ENABLED = ${sslEnabled}`);
            
            // Return the TypeORM options
            return {
              type: 'postgres',
              host,
              port,
              username,
              password,
              database,
              entities,
              synchronize: sync,
              dropSchema: dropBeforeSync,
              // Set pool configuration
              extra: {
                // Connection pool
                max: maxPoolSize,
                min: poolSize,
                connectionTimeoutMillis: connectionTimeout,
                idleTimeoutMillis: idleTimeout,
                query_timeout: queryTimeout,
              },
              // Enable SSL if configured
              ssl: sslEnabled,
              logging: logging ? logging.split(',') : false,
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
