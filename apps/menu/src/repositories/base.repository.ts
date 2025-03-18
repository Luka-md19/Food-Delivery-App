import { Injectable, Logger } from '@nestjs/common';
import { MongoDBService } from '@app/common/database/mongodb';
import { Collection, ObjectId } from 'mongodb';

@Injectable()
export abstract class BaseRepository {
  protected readonly logger: Logger;
  protected collection: Collection;
  protected readonly collectionName: string;

  constructor(
    protected readonly mongoDBService: MongoDBService,
    collectionName: string,
    loggerName: string
  ) {
    this.collectionName = collectionName;
    this.logger = new Logger(loggerName);
    this.logger.log(`${loggerName} constructor called`);
  }

  async onModuleInit() {
    this.logger.log(`Initializing ${this.constructor.name}...`);
    this.collection = await this.mongoDBService.getCollection(this.collectionName);
    this.logger.log(`${this.constructor.name} initialized with collection: ${this.collectionName}`);
  }

  protected async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.logger.log('Collection not initialized yet, getting it now...');
      this.collection = await this.mongoDBService.getCollection(this.collectionName);
    }
    return this.collection;
  }

  protected validateObjectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch (error) {
      this.logger.error(`Invalid ObjectId format: ${id}`);
      throw new Error(`Invalid ID format: ${id}`);
    }
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<any[]> {
    const collection = await this.getCollection();
    const skip = (page - 1) * limit;
    return collection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async count(filter: any = {}): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(filter);
  }

  async findById(id: string): Promise<any | null> {
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      const document = await collection.findOne({ _id: objectId });
      if (!document) {
        this.logger.debug(`Document with ID ${id} not found`);
      }
      return document;
    } catch (error) {
      this.logger.error(`Error finding document by ID: ${error.message}`);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      const result = await collection.deleteOne({ _id: objectId });
      return result.deletedCount === 1;
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`);
      return false;
    }
  }
} 