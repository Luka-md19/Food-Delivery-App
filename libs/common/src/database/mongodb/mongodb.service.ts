import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, Collection } from 'mongodb';
import { AppConfigService } from '../../config/config.service';
import { LoggerFactory } from '../../logger/logger.factory';
import mongoose from 'mongoose';

// Define the MongoDBConfig interface
interface MongoDBConfig {
  uri: string;
  database: string;
  options: Record<string, any>;
}

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = LoggerFactory.getLogger(MongoDBService.name);
  private connectionPromise: Promise<void>;
  private isConnected = false;
  private connection: typeof mongoose;

  constructor(private readonly configService: AppConfigService) {
    this.logger.log('MongoDBService constructor called');
    // Start the connection process immediately
    this.connectionPromise = this.connect();
  }

  async onModuleInit() {
    this.logger.log('MongoDBService initializing...');
    try {
      // Wait for the connection to be established
      await this.connectionPromise;
    } catch (error) {
      this.logger.error(`Failed to connect to MongoDB: ${error.message}`, error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  /**
   * Masks sensitive information in a connection string
   * @param uri MongoDB connection string
   * @returns Masked connection string with credentials hidden
   */
  private maskConnectionString(uri: string): string {
    if (!uri) return '[undefined]';
    try {
      return uri.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/g, 'mongodb$1://[username]:[password]@');
    } catch {
      return '[invalid-uri-format]';
    }
  }

  private async connect(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds
    
    while (retryCount < maxRetries) {
      try {
        this.logger.log('Attempting to connect to MongoDB...');
        
        // Get MongoDB configuration but don't log sensitive details
        const config = this.configService.get<MongoDBConfig>('mongodb');
        if (!config || !config.uri) {
          throw new Error('MongoDB configuration is missing or invalid');
        }

        // Check if we have a masked URI and restore the original if needed
        if (config.uri.includes('[MASKED-MONGODB_URI]') && (global as any)._originalEnvVars?.MONGODB_URI) {
          config.uri = (global as any)._originalEnvVars.MONGODB_URI;
          this.logger.log('Restored original MongoDB URI from backup');
        }

        // Log non-sensitive config details only
        this.logger.log(`MONGODB_DATABASE: ${config.database || process.env.MONGODB_DATABASE}`);
        this.logger.log(`USE_DOCKER: ${process.env.USE_DOCKER}`);
        this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
        this.logger.log(`MONGODB_SSL_ENABLED: ${process.env.MONGODB_SSL_ENABLED}`);
        
        // Log config without sensitive data
        const safeConfig = {
          ...config,
          uri: this.maskConnectionString(config.uri)
        };
        this.logger.debug(`MongoDB config: ${JSON.stringify(safeConfig)}`);
        
        // Determine if we're running in Docker
        const isDocker = process.env.USE_DOCKER === 'true';
        const sslEnabled = process.env.MONGODB_SSL_ENABLED !== 'false'; // Default to true if not specified
        
        // Modify connection options based on environment
        let connectionOptions = { ...config.options };
        
        // Configure SSL/TLS settings
        if (config.uri.includes('mongodb+srv')) {
          this.logger.log('Detected MongoDB Atlas connection');
          
          // For MongoDB Atlas, we need SSL
          connectionOptions.ssl = true;
          connectionOptions.tls = true;
          
          // Always allow invalid certificates and hostnames when using Atlas in containers
          // This is needed when connecting from Docker containers
          if (isDocker || process.env.NODE_ENV === 'development') {
            connectionOptions.tlsAllowInvalidCertificates = true;
            connectionOptions.tlsAllowInvalidHostnames = true;
          }
          
          // For Atlas, increase timeouts since network connectivity might be slower
          connectionOptions.connectTimeoutMS = parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '30000', 10);
          connectionOptions.socketTimeoutMS = parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '60000', 10);
          connectionOptions.serverSelectionTimeoutMS = 30000; // 30 seconds
          connectionOptions.heartbeatFrequencyMS = 10000; // 10 seconds
        } else {
          // For local MongoDB, disable SSL
          this.logger.log('Detected local MongoDB connection - disabling SSL/TLS settings');
          delete connectionOptions.ssl;
          delete connectionOptions.tls;
          delete connectionOptions.tlsAllowInvalidCertificates;
          delete connectionOptions.tlsAllowInvalidHostnames;
        }
        
        // Log the masked connection string, not the real one
        this.logger.log(`Connecting to MongoDB: ${this.maskConnectionString(config.uri)}`);
        this.logger.log(`Database name: ${config.database}`);
        
        // Log connection options without any potential sensitive information
        const safeOptions = { ...connectionOptions };
        delete safeOptions.pass;
        delete safeOptions.password;
        delete safeOptions.auth;
        this.logger.log(`Connection options: ${JSON.stringify(safeOptions)}`);
        
        // Use the IP-agnostic URI format for Atlas to bypass IP whitelist issues
        let uri = config.uri;
        if (isDocker && uri.includes('mongodb+srv')) {
          this.logger.log('Running in Docker with MongoDB Atlas, ensuring correct connection string format');
          // Make sure we're using retryWrites and majority write concern
          if (!uri.includes('retryWrites=true')) {
            uri += uri.includes('?') ? '&retryWrites=true' : '?retryWrites=true';
          }
          if (!uri.includes('w=majority')) {
            uri += uri.includes('?') ? '&w=majority' : '?w=majority';
          }
        }
        
        this.connection = await mongoose.connect(uri, {
          ...connectionOptions,
          dbName: config.database,
        });
        
        // Test the connection with a simple ping
        const pingResult = await mongoose.connection.db.command({ ping: 1 });
        this.logger.log(`MongoDB ping result: ${JSON.stringify(pingResult)}`);
        
        this.logger.log(`MongoDB connection successful to database: ${config.database}`);
        this.isConnected = true;
        break; // Exit the retry loop on success
      } catch (error) {
        retryCount++;
        // Mask any sensitive information that might be in the error message
        const safeErrorMessage = error.message?.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/g, 'mongodb$1://[username]:[password]@') || 'Unknown error';
        this.logger.error(`Failed to connect to MongoDB (attempt ${retryCount}/${maxRetries}): ${safeErrorMessage}`);
        
        if (error.message?.includes('IP address is not whitelisted') || 
            error.message?.includes('whitelist') || 
            error.message?.includes('ENOTFOUND') ||
            error.message?.includes('Authentication failed')) {
          this.logger.warn(`IP whitelist or authentication error detected. Make sure to whitelist the Docker container IP or use an Atlas connection string without IP whitelist restrictions.`);
          
          // If in Docker, provide additional guidance
          if (process.env.USE_DOCKER === 'true') {
            this.logger.warn(`For Docker environments, consider using Network Peering or disabling IP whitelist in MongoDB Atlas.`);
            this.logger.warn(`Alternatively, switch to using a local MongoDB instance for development.`);
          }
        }
        
        if (retryCount < maxRetries) {
          this.logger.log(`Retrying in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`Maximum retry attempts (${maxRetries}) reached. Could not connect to MongoDB.`);
          throw new Error(`Could not connect to MongoDB after ${maxRetries} attempts: ${safeErrorMessage}`);
        }
      }
    }
  }

  private async close() {
    if (this.connection) {
      await mongoose.disconnect();
      this.logger.log('MongoDB connection closed');
      this.isConnected = false;
    }
  }

  async getDb(): Promise<any> {
    try {
      if (!this.isConnected) {
        this.logger.log('Database not connected yet, waiting for connection...');
        
        try {
          await this.connectionPromise;
        } catch (error) {
          throw error;
        }
      }
      
      if (!mongoose.connection || !mongoose.connection.db) {
        this.logger.error('MongoDB database is not initialized');
        throw new Error('MongoDB database is not initialized');
      }
      
      return mongoose.connection.db;
    } catch (error) {
      throw error;
    }
  }

  /**
   * A lightweight health check method that doesn't cause high CPU usage
   * @returns A boolean indicating if the connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !mongoose.connection || mongoose.connection.readyState !== 1) {
        return false;
      }
      
      // Use connection status check instead of a database operation
      // This is more efficient than running a command
      return mongoose.connection.readyState === 1;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return false;
    }
  }

  async getCollection(name: string): Promise<Collection> {
    try {
      if (!this.isConnected) {
        this.logger.log('Not connected yet, waiting for connection...');
      }
      
      const db = await this.getDb();
      
      try {
        const collection = db.collection(name);
        return collection;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Adds transaction support for safe operations with commit and rollback.
  async withTransaction<T>(operation: (session) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      this.logger.log('Database not connected yet, waiting for connection...');
      await this.connectionPromise;
    }
    
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      // Ensure no sensitive data in error logs
      const safeErrorMessage = error.message?.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/g, 'mongodb$1://[username]:[password]@') || 'Unknown error';
      this.logger.error(`Transaction failed: ${safeErrorMessage}`, error.stack);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

