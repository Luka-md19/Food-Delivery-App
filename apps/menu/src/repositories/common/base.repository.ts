import { Injectable } from '@nestjs/common';
import { BaseRepository as CommonBaseRepository } from '@app/common/database/mongodb/base-repository';
import { BaseDocument } from '@app/common/database/mongodb/mongo.types';
import { MongoDBService } from '@app/common/database/mongodb';
import { Collection, ObjectId } from 'mongodb';
import { ValidatorService } from '@app/common/exceptions';
import { LoggerFactory } from '@app/common/logger';

/**
 * Base repository for all menu application repositories.
 * Extends the common BaseRepository to standardize operations.
 * 
 * @template T The document/entity type
 */
@Injectable()
export abstract class BaseRepository<T extends BaseDocument> extends CommonBaseRepository<T> {
  protected readonly logger: any;
  protected collection!: Collection<T>;
  protected readonly collectionName: string;
  protected readonly validator: ValidatorService;
  protected collections: { [key: string]: Collection } = {};

  /**
   * Creates a new repository instance
   * 
   * @param mongoDBService MongoDB service for database access
   * @param collectionName Name of the collection this repository works with
   * @param serviceName Name of the service for logging purposes
   */
  constructor(
    protected readonly mongoDBService: MongoDBService,
    collectionName: string,
    serviceName: string
  ) {
    super(mongoDBService, collectionName, serviceName);
    this.collectionName = collectionName;
    this.logger = LoggerFactory.getLogger(serviceName);
    this.validator = new ValidatorService();
  }

  async onModuleInit(): Promise<void> {
    this.collection = await this.getCollection();
    this.logger.log(`${this.constructor.name} initialized with collection: ${this.collectionName}`);
  }

  protected async getCollection(): Promise<Collection<T>> {
    try {
      if (!this.collection) {
        this.logger.log('Collection not initialized yet, getting it now...');
        
        if (!this.mongoDBService) {
          throw new Error('mongoDBService is not defined');
        }
        
        this.collection = await this.mongoDBService.getCollection(this.collectionName) as unknown as Collection<T>;
      }
      return this.collection;
    } catch (error) {
      throw error;
    }
  }

  protected validateObjectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch (error) {
      this.logger.error(`Invalid ObjectId: ${id}`);
      throw new Error(`Invalid ID format: ${id}`);
    }
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<any[]> {
    try {
      const collection = await this.getCollection();
      const pagination = this.validator.validatePagination(page, limit);
      const skip = (pagination.page - 1) * pagination.limit;
      
      // Process the filter to convert string IDs to ObjectIds if needed
      const processedFilter: any = {};
      
      // Only process the filter if it's not empty
      if (Object.keys(filter).length > 0) {
        this.logger.debug(`Processing filter: ${JSON.stringify(filter)}`);
        
        // Handle common ID fields that might be in the filter
        if (filter._id && typeof filter._id === 'string') {
          try {
            processedFilter._id = new ObjectId(filter._id);
          } catch (error) {
            this.logger.warn(`Invalid _id format in filter: ${filter._id}, using as string`);
            processedFilter._id = filter._id;
          }
        }
        
        if (filter.menuId && typeof filter.menuId === 'string') {
          try {
            processedFilter.menuId = new ObjectId(filter.menuId);
          } catch (error) {
            this.logger.warn(`Invalid menuId format in filter: ${filter.menuId}, using as string`);
            processedFilter.menuId = filter.menuId;
          }
        }
        
        if (filter.parentCategoryId && typeof filter.parentCategoryId === 'string') {
          try {
            processedFilter.parentCategoryId = new ObjectId(filter.parentCategoryId);
          } catch (error) {
            this.logger.warn(`Invalid parentCategoryId format in filter: ${filter.parentCategoryId}, using as string`);
            processedFilter.parentCategoryId = filter.parentCategoryId;
          }
        }
        
        // Copy other filter properties that don't need conversion
        Object.keys(filter).forEach(key => {
          if (!['_id', 'menuId', 'parentCategoryId'].includes(key)) {
            processedFilter[key] = filter[key];
          }
        });
      }
      
      // Log the filter we're using
      this.logger.debug(`Finding documents in ${this.collectionName} with filter: ${JSON.stringify(processedFilter)}`);
      
      const result = await collection.find(processedFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .toArray();
      
      this.logger.debug(`Found ${result.length} documents in ${this.collectionName}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`);
      return [];
    }
  }

  async count(filter: any = {}): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(filter);
  }

  async findById(id: string): Promise<any | null> {
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      const document = await collection.findOne({ _id: objectId } as any);
      if (!document) {
        this.logger.debug(`Document with ID ${id} not found`);
      }
      return document;
    } catch (error) {
      this.logger.error(`Error finding document by ID: ${error.message}`);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const collection = await this.getCollection();
      
      const result = await collection.insertOne({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0
      } as any);
      
      if (!result.acknowledged) {
        throw new Error('Failed to insert document');
      }
      
      return this.findById(result.insertedId.toString());
    } catch (error) {
      this.logger.error(`Error creating document: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<any | null> {
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      // Remove undefined properties
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
      
      // Type the entire update object as any to resolve TypeScript errors with $inc
      const updateObj = { 
        $set: { 
          ...data,
          updatedAt: new Date() 
        },
        $inc: { version: 1 }
      } as any;
      
      const result = await collection.findOneAndUpdate(
        { _id: objectId } as any,
        updateObj,
        { returnDocument: 'after' }
      );
      
      return result.value;
    } catch (error) {
      this.logger.error(`Error updating document: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      const result = await collection.deleteOne({ _id: objectId } as any);
      return result.deletedCount === 1;
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`);
      throw error;
    }
  }

  async save(data: any): Promise<any> {
    if (data._id) {
      const { _id, ...updateData } = data;
      return this.update(_id.toString(), updateData);
    } else {
      return this.create(data);
    }
  }
}