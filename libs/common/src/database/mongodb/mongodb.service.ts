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

  private async connect(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds
    
    while (retryCount < maxRetries) {
      try {
        this.logger.log('Attempting to connect to MongoDB...');
        
        // Log environment variables for debugging
        this.logger.log(`MONGODB_URI: ${process.env.MONGODB_URI}`);
        this.logger.log(`MONGODB_DATABASE: ${process.env.MONGODB_DATABASE}`);
        this.logger.log(`USE_DOCKER: ${process.env.USE_DOCKER}`);
        this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
        this.logger.log(`MONGODB_SSL_ENABLED: ${process.env.MONGODB_SSL_ENABLED}`);
        
        const config = this.configService.get<MongoDBConfig>('mongodb');
        this.logger.log(`MongoDB config: ${JSON.stringify(config)}`);
        
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
          connectionOptions.serverSelectionTimeoutMS = 60000; // 60 seconds
        } else {
          // For local MongoDB, disable SSL
          this.logger.log('Detected local MongoDB connection - disabling SSL/TLS settings');
          delete connectionOptions.ssl;
          delete connectionOptions.tls;
          delete connectionOptions.tlsAllowInvalidCertificates;
          delete connectionOptions.tlsAllowInvalidHostnames;
        }
        
        this.logger.log(`Connecting to MongoDB: ${config.uri}`);
        this.logger.log(`Database name: ${config.database}`);
        this.logger.log(`Connection options: ${JSON.stringify(connectionOptions)}`);
        
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
        this.logger.error(`Failed to connect to MongoDB (attempt ${retryCount}/${maxRetries}): ${error.message}`);
        
        if (error.message.includes('IP address is not whitelisted') || 
            error.message.includes('whitelist') || 
            error.message.includes('ENOTFOUND') ||
            error.message.includes('Authentication failed')) {
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
          throw new Error(`Could not connect to MongoDB after ${maxRetries} attempts: ${error.message}`);
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
    if (!this.isConnected) {
      this.logger.log('Database not connected yet, waiting for connection...');
      await this.connectionPromise;
    }
    
    if (!mongoose.connection || !mongoose.connection.db) {
      this.logger.error('MongoDB database is not initialized');
      throw new Error('MongoDB database is not initialized');
    }
    
    return mongoose.connection.db;
  }

  async getCollection(name: string): Promise<Collection> {
    const db = await this.getDb();
    return db.collection(name);
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
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

