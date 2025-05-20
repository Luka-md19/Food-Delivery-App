import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  sync: process.env.DATABASE_SYNC === 'true',
  autoLoadEntities: process.env.DATABASE_AUTOLOAD === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  maxPoolSize: parseInt(process.env.DATABASE_MAX_POOL_SIZE || '20', 10),
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
  queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10),
  sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
}));
