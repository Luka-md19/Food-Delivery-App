#!/usr/bin/env node

/**
 * Script to check if all dependencies are ready before starting the application
 * This script will check if MongoDB and RabbitMQ are ready before starting the application
 */

const amqp = require('amqplib');
const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');

// Simple logger implementation
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://root:password@mongodb:27017/menu?authSource=admin',
    database: process.env.MONGODB_DATABASE || 'menu',
    maxRetries: 30,
    retryDelay: 2000,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
    queue: process.env.RABBITMQ_QUEUE || 'menu_service_queue',
    maxRetries: 30,
    retryDelay: 2000
  },
  application: {
    port: process.env.PORT || 3002,
    tcpPort: process.env.TCP_PORT || 3003,
    environment: process.env.NODE_ENV || 'development'
  }
};

/**
 * Check if MongoDB is ready
 */
async function checkMongoDBConnection() {
  logger.info('Checking MongoDB connection...');
  logger.info(`MongoDB URI: ${config.mongodb.uri}`);
  logger.info(`MongoDB Database: ${config.mongodb.database}`);
  
  for (let attempt = 1; attempt <= config.mongodb.maxRetries; attempt++) {
    try {
      logger.info(`MongoDB connection attempt ${attempt}/${config.mongodb.maxRetries}`);
      
      const client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await client.connect();
      await client.db(config.mongodb.database).command({ ping: 1 });
      await client.close();
      
      logger.info('MongoDB connection successful');
      return true;
    } catch (error) {
      logger.warn(`Failed to connect to MongoDB: ${error.message}`);
      
      if (attempt === config.mongodb.maxRetries) {
        logger.error(`Maximum MongoDB retry attempts (${config.mongodb.maxRetries}) reached. Giving up.`);
        return false;
      }
      
      logger.info(`Waiting ${config.mongodb.retryDelay}ms before next MongoDB connection attempt...`);
      await new Promise(resolve => setTimeout(resolve, config.mongodb.retryDelay));
    }
  }
  
  return false;
}

/**
 * Check if RabbitMQ is ready
 */
async function checkRabbitMQConnection() {
  logger.info('Checking RabbitMQ connection...');
  logger.info(`RabbitMQ URL: ${config.rabbitmq.url}`);
  logger.info(`RabbitMQ Queue: ${config.rabbitmq.queue}`);
  
  for (let attempt = 1; attempt <= config.rabbitmq.maxRetries; attempt++) {
    try {
      logger.info(`RabbitMQ connection attempt ${attempt}/${config.rabbitmq.maxRetries}`);
      
      const connection = await amqp.connect(config.rabbitmq.url);
      const channel = await connection.createChannel();
      
      // Assert the queue to make sure it exists
      await channel.assertQueue(config.rabbitmq.queue, { durable: true });
      
      await channel.close();
      await connection.close();
      
      logger.info('RabbitMQ connection successful');
      return true;
    } catch (error) {
      logger.warn(`Failed to connect to RabbitMQ: ${error.message}`);
      
      if (attempt === config.rabbitmq.maxRetries) {
        logger.error(`Maximum RabbitMQ retry attempts (${config.rabbitmq.maxRetries}) reached. Giving up.`);
        return false;
      }
      
      logger.info(`Waiting ${config.rabbitmq.retryDelay}ms before next RabbitMQ connection attempt...`);
      await new Promise(resolve => setTimeout(resolve, config.rabbitmq.retryDelay));
    }
  }
  
  return false;
}

/**
 * Main function
 */
async function main() {
  logger.info('Starting dependency check...');
  logger.info(`Application environment: ${config.application.environment}`);
  logger.info(`Application will run on HTTP port ${config.application.port}`);
  logger.info(`Application will run on TCP port ${config.application.tcpPort}`);
  
  // Check MongoDB connection
  const isMongoDBReady = await checkMongoDBConnection();
  if (!isMongoDBReady) {
    logger.warn('MongoDB is not ready, but proceeding with application startup anyway');
    logger.warn('Some database operations may fail until MongoDB becomes available');
  }
  
  // Check RabbitMQ connection
  const isRabbitMQReady = await checkRabbitMQConnection();
  if (!isRabbitMQReady) {
    logger.warn('RabbitMQ is not ready, but proceeding with application startup anyway');
    logger.warn('Messages will be stored locally until RabbitMQ becomes available');
  }
  
  // Start the application
  logger.info('Starting the application...');
  
  try {
    // Execute the command to start the application
    execSync('node dist/main.js', { stdio: 'inherit' });
  } catch (error) {
    logger.error(`Failed to start the application: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 