import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * Service for storing failed messages in the file system as a fallback
 * when the database is unavailable
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly writeFileAsync = promisify(fs.writeFile);
  private readonly readFileAsync = promisify(fs.readFile);
  private readonly mkdirAsync = promisify(fs.mkdir);
  private readonly readdirAsync = promisify(fs.readdir);
  private readonly unlinkAsync = promisify(fs.unlink);
  private readonly storageDir: string;

  constructor() {
    // Use a directory in the project for development, but in production
    // this should be a configurable path outside the project
    this.storageDir = path.join(process.cwd(), 'storage', 'failed-messages');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the storage directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await this.mkdirAsync(this.storageDir, { recursive: true });
      this.logger.log(`Storage directory created: ${this.storageDir}`);
    } catch (error) {
      this.logger.error(`Failed to create storage directory: ${error.message}`, error.stack);
    }
  }

  /**
   * Store a failed message in the file system
   * @param pattern The event pattern
   * @param payload The event payload
   * @param errorMessage The error message
   */
  async storeFailedMessage(pattern: string, payload: any, errorMessage: string): Promise<string> {
    try {
      await this.ensureDirectoryExists();
      
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const id = `${timestamp}-${Math.random().toString(36).substring(2, 15)}`;
      const fileName = `${id}.json`;
      const filePath = path.join(this.storageDir, fileName);
      
      const data = {
        id,
        pattern,
        payload,
        errorMessage,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        processed: false
      };
      
      await this.writeFileAsync(filePath, JSON.stringify(data, null, 2), 'utf8');
      this.logger.log(`Failed message stored in file: ${filePath}`);
      
      return id;
    } catch (error) {
      this.logger.error(`Failed to store message in file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all unprocessed failed messages from the file system
   * @param limit Maximum number of messages to retrieve
   */
  async getUnprocessedMessages(limit = 100): Promise<any[]> {
    try {
      await this.ensureDirectoryExists();
      
      const files = await this.readdirAsync(this.storageDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const messages = [];
      
      for (const file of jsonFiles) {
        if (messages.length >= limit) break;
        
        try {
          const filePath = path.join(this.storageDir, file);
          const content = await this.readFileAsync(filePath, 'utf8');
          const message = JSON.parse(content);
          
          if (!message.processed) {
            messages.push(message);
          }
        } catch (error) {
          this.logger.error(`Error reading file ${file}: ${error.message}`);
        }
      }
      
      return messages;
    } catch (error) {
      this.logger.error(`Failed to get unprocessed messages: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Mark a failed message as processed
   * @param id The message ID
   */
  async markAsProcessed(id: string): Promise<boolean> {
    try {
      await this.ensureDirectoryExists();
      
      const files = await this.readdirAsync(this.storageDir);
      const messageFile = files.find(file => file.startsWith(`${id}.json`));
      
      if (!messageFile) {
        this.logger.warn(`Message file with ID ${id} not found`);
        return false;
      }
      
      const filePath = path.join(this.storageDir, messageFile);
      const content = await this.readFileAsync(filePath, 'utf8');
      const message = JSON.parse(content);
      
      message.processed = true;
      message.updatedAt = new Date().toISOString();
      
      await this.writeFileAsync(filePath, JSON.stringify(message, null, 2), 'utf8');
      this.logger.log(`Message ${id} marked as processed`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark message as processed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Update retry count and error for a failed message
   * @param id The message ID
   * @param errorMessage The error message
   */
  async updateRetryCount(id: string, errorMessage?: string): Promise<any> {
    try {
      await this.ensureDirectoryExists();
      
      const files = await this.readdirAsync(this.storageDir);
      const messageFile = files.find(file => file.startsWith(`${id}.json`));
      
      if (!messageFile) {
        this.logger.warn(`Message file with ID ${id} not found`);
        return null;
      }
      
      const filePath = path.join(this.storageDir, messageFile);
      const content = await this.readFileAsync(filePath, 'utf8');
      const message = JSON.parse(content);
      
      message.retryCount += 1;
      if (errorMessage) {
        message.errorMessage = errorMessage;
      }
      message.updatedAt = new Date().toISOString();
      
      await this.writeFileAsync(filePath, JSON.stringify(message, null, 2), 'utf8');
      this.logger.log(`Retry count updated for message ${id}`);
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to update retry count: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Delete processed messages older than the specified date
   * @param olderThan Date threshold for deletion
   */
  async cleanupProcessedMessages(olderThan: Date): Promise<number> {
    try {
      await this.ensureDirectoryExists();
      
      const files = await this.readdirAsync(this.storageDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      let deletedCount = 0;
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const content = await this.readFileAsync(filePath, 'utf8');
          const message = JSON.parse(content);
          
          if (message.processed) {
            const updatedAt = new Date(message.updatedAt || message.timestamp);
            
            if (updatedAt < olderThan) {
              await this.unlinkAsync(filePath);
              deletedCount++;
            }
          }
        } catch (error) {
          this.logger.error(`Error processing file ${file}: ${error.message}`);
        }
      }
      
      this.logger.log(`Deleted ${deletedCount} processed message files`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup processed messages: ${error.message}`, error.stack);
      return 0;
    }
  }
} 