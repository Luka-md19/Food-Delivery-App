import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DATABASE,
  options: {
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
    tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
    tlsCAFile: process.env.MONGODB_TLS_CA_FILE,
    serverSelectionTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
  },
})); 