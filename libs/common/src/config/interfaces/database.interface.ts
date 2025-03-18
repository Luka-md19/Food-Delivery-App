// libs/common/src/config/interfaces/database.interface.ts
export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    autoLoadEntities: boolean;
  }