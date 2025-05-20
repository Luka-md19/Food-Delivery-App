import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => {
  // Get MongoDB URI with fallback to global storage if it was masked
  let mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.includes('[MASKED-MONGODB_URI]') && (global as any)._originalEnvVars?.MONGODB_URI) {
    mongoUri = (global as any)._originalEnvVars.MONGODB_URI;
  }
  
  return {
    uri: mongoUri,
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
  };
}); 