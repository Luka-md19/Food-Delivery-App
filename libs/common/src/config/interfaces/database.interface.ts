// libs/common/src/config/interfaces/database.interface.ts
export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    sync?: boolean;
    autoLoadEntities?: boolean;
    logging?: boolean;
    poolSize?: number;
    maxPoolSize?: number;
    connectionTimeout?: number;
    idleTimeout?: number;
    queryTimeout?: number;
    sslEnabled?: boolean;
}