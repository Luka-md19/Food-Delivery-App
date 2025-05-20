import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, ObjectId, Filter, Sort, Document, OptionalId, UpdateFilter, FindOptions, WithId, OptionalUnlessRequiredId } from 'mongodb';
import { MongoDBService } from './mongodb.service';
import { ValidatorService } from '../../exceptions/validator.service';
import { ErrorHandlerService } from '../../exceptions/error-handler.service';
import { BaseRepositoryException } from './exceptions/base-repository.exception';
import { BaseDocument } from './mongo.types';
import { NotFoundException } from './exceptions/not-found.exception';

/**
 * Base repository that provides common MongoDB operations
 * @template T The entity type this repository works with
 */
@Injectable()
export abstract class BaseRepository<T extends BaseDocument> implements OnModuleInit {
  protected readonly logger: Logger;
  protected collection!: Collection<T>;
  protected readonly collectionName: string;
  protected readonly validator: ValidatorService;
  protected readonly errorHandler: ErrorHandlerService;

  /**
   * Creates a new BaseRepository
   * @param mongoDBService MongoDB service for database access
   * @param collectionName Name of the collection this repository works with
   * @param serviceName Name of the service for logging purposes
   */
  constructor(
    protected readonly mongoDBService: MongoDBService,
    collectionName: string,
    serviceName: string
  ) {
    this.collectionName = collectionName;
    this.logger = new Logger(`${serviceName}.${this.constructor.name}`);
    this.validator = new ValidatorService();
    this.errorHandler = new ErrorHandlerService(this.constructor.name);
  }

  /**
   * Initialize the repository on module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      this.collection = await this.getCollection();
      this.logger.log(`${this.constructor.name} initialized with collection: ${this.collectionName}`);
    } catch (error: any) {
      this.logger.error(`Failed to initialize ${this.constructor.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the MongoDB collection for this repository
   * @returns The MongoDB collection
   */
  protected async getCollection(): Promise<Collection<T>> {
    try {
      if (!this.collection) {
        this.logger.debug('Collection not initialized yet, getting it now...');
        
        if (!this.mongoDBService) {
          throw new BaseRepositoryException('mongoDBService is not defined');
        }
        
        const collection = await this.mongoDBService.getCollection(this.collectionName);
        if (!collection) {
          throw new BaseRepositoryException(`Collection ${this.collectionName} could not be retrieved`);
        }
        
        this.collection = collection as unknown as Collection<T>;
      }
      return this.collection;
    } catch (error: any) {
      this.logger.error(`Error getting collection ${this.collectionName}: ${error.message}`);
      throw new BaseRepositoryException(`Failed to get collection: ${error.message}`);
    }
  }

  /**
   * Validates and converts a string ID to an ObjectId
   * @param id String ID to validate
   * @returns MongoDB ObjectId
   * @throws Error if the ID format is invalid
   */
  protected validateObjectId(id: string): ObjectId {
    if (!id) {
      this.logger.error('ObjectId is null or undefined');
      throw new BaseRepositoryException('Invalid ID: ID cannot be null or undefined');
    }
    
    try {
      return new ObjectId(id);
    } catch (error: any) {
      this.logger.error(`Invalid ObjectId: ${id}`);
      throw new BaseRepositoryException(`Invalid ID format: ${id}`);
    }
  }

  /**
   * Processes a filter object to convert string IDs to ObjectIds
   * @param filter Filter object to process
   * @param idFields Array of field names that should be converted to ObjectId
   * @returns Processed filter with ObjectIds
   */
  protected processFilter(filter: any = {}, idFields: string[] = ['_id']): Filter<T> {
    const processedFilter: Record<string, any> = {};
    
    if (!filter || typeof filter !== 'object') {
      this.logger.debug('Filter is not an object, using empty filter');
      return {} as Filter<T>;
    }
    
    Object.keys(filter).forEach(key => {
      if (filter[key] === undefined) {
        return; // Skip undefined values
      }
      
      if (idFields.includes(key) && typeof filter[key] === 'string') {
        try {
          processedFilter[key] = new ObjectId(filter[key]);
        } catch (error) {
          this.logger.warn(`Invalid ${key} format in filter: ${filter[key]}, using as-is`);
          processedFilter[key] = filter[key];
        }
      } else {
        processedFilter[key] = filter[key];
      }
    });
    
    return processedFilter as Filter<T>;
  }

  /**
   * Find all documents matching a filter with pagination
   * @param filter Filter to apply
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @param sort Sorting options
   * @param idFields Fields that should be treated as IDs
   * @returns Array of documents
   */
  async findAll(
    filter: any = {}, 
    page = 1, 
    limit = 10, 
    sort: Sort = { createdAt: -1 },
    idFields: string[] = ['_id']
  ): Promise<T[]> {
    try {
      const collection = await this.getCollection();
      const pagination = this.validator.validatePagination(page, limit);
      const skip = (pagination.page - 1) * pagination.limit;
      
      const processedFilter = this.processFilter(filter, idFields);
      
      this.logger.debug(`Finding documents with filter: ${JSON.stringify(processedFilter)}, page: ${page}, limit: ${limit}`);
      
      const results = await collection.find(processedFilter, { 
        skip: skip,
        limit: pagination.limit,
        sort
      } as FindOptions<T>).toArray();
      
      // Convert WithId<T> to T - MongoDB 4.x+ typing issue
      return results as unknown as T[];
    } catch (error: any) {
      this.logger.error(`Error in findAll: ${error.message}`);
      throw new BaseRepositoryException(`Failed to find documents: ${error.message}`);
    }
  }

  /**
   * Count documents matching a filter
   * @param filter Filter to apply
   * @param idFields Fields that should be treated as IDs
   * @returns Number of documents
   */
  async count(filter: any = {}, idFields: string[] = ['_id']): Promise<number> {
    try {
      const collection = await this.getCollection();
      const processedFilter = this.processFilter(filter, idFields);
      
      this.logger.debug(`Counting documents with filter: ${JSON.stringify(processedFilter)}`);
      
      return collection.countDocuments(processedFilter);
    } catch (error: any) {
      this.logger.error(`Error in count: ${error.message}`);
      throw new BaseRepositoryException(`Failed to count documents: ${error.message}`);
    }
  }

  /**
   * Find a document by ID
   * @param id Document ID
   * @returns Document or null if not found
   */
  async findById(id: string): Promise<T | null> {
    if (!id) {
      this.logger.error('findById called with null or undefined ID');
      throw new BaseRepositoryException('ID cannot be null or undefined');
    }
    
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      this.logger.debug(`Finding document by ID: ${id}`);
      
      const document = await collection.findOne({ _id: objectId } as unknown as Filter<T>);
      if (!document) {
        this.logger.debug(`Document with ID ${id} not found`);
      }
      return document as T | null;
    } catch (error: any) {
      if (error instanceof BaseRepositoryException) {
        throw error;
      }
      this.logger.error(`Error finding document by ID: ${error.message}`);
      throw new BaseRepositoryException(`Failed to find document by ID: ${error.message}`);
    }
  }

  /**
   * Find a document by ID or throw an exception if not found
   * @param id Document ID
   * @returns Document
   * @throws NotFoundException if document is not found
   */
  async findByIdOrFail(id: string): Promise<T> {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  /**
   * Create a new document
   * @param data Document data
   * @returns Created document
   */
  async create(data: Omit<T, '_id'>): Promise<T> {
    if (!data) {
      throw new BaseRepositoryException('Cannot create document with null or undefined data');
    }
    
    try {
      const collection = await this.getCollection();
      
      const documentToInsert = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0
      } as unknown as OptionalUnlessRequiredId<T>;
      
      this.logger.debug(`Creating document: ${JSON.stringify(data)}`);
      
      const result = await collection.insertOne(documentToInsert);
      
      if (!result.acknowledged) {
        throw new BaseRepositoryException('Failed to insert document');
      }
      
      const insertedDocument = await this.findById(result.insertedId.toString());
      if (!insertedDocument) {
        throw new BaseRepositoryException('Document was inserted but could not be retrieved');
      }
      
      return insertedDocument;
    } catch (error: any) {
      this.logger.error(`Error creating document: ${error.message}`);
      throw new BaseRepositoryException(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Update a document by ID
   * @param id Document ID
   * @param data Update data
   * @returns Updated document or null if not found
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    if (!id) {
      throw new BaseRepositoryException('Cannot update document with null or undefined ID');
    }
    
    if (!data || Object.keys(data).length === 0) {
      this.logger.warn(`Update called with empty data for ID ${id}`);
      return this.findById(id);
    }
    
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      // Remove undefined properties
      Object.keys(data).forEach(key => {
        if (data[key as keyof Partial<T>] === undefined) {
          delete data[key as keyof Partial<T>];
        }
      });
      
      this.logger.debug(`Updating document ${id} with data: ${JSON.stringify(data)}`);
      
      const updateData = {
        $set: { 
          ...data,
          updatedAt: new Date() 
        },
        $inc: { version: 1 }
      } as unknown as UpdateFilter<T>;
      
      const result = await collection.findOneAndUpdate(
        { _id: objectId } as unknown as Filter<T>,
        updateData,
        { returnDocument: 'after' }
      );
      
      return result.value as T | null;
    } catch (error: any) {
      if (error instanceof BaseRepositoryException) {
        throw error;
      }
      this.logger.error(`Error updating document: ${error.message}`);
      throw new BaseRepositoryException(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Delete a document by ID
   * @param id Document ID
   * @returns True if document was deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new BaseRepositoryException('Cannot delete document with null or undefined ID');
    }
    
    try {
      const collection = await this.getCollection();
      const objectId = this.validateObjectId(id);
      
      this.logger.debug(`Deleting document with ID: ${id}`);
      
      const result = await collection.deleteOne({ _id: objectId } as unknown as Filter<T>);
      return result.deletedCount === 1;
    } catch (error: any) {
      if (error instanceof BaseRepositoryException) {
        throw error;
      }
      this.logger.error(`Error deleting document: ${error.message}`);
      throw new BaseRepositoryException(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Save a document (create if new, update if existing)
   * @param data Document data
   * @returns Saved document
   */
  async save(data: Partial<T> & { _id?: any }): Promise<T> {
    if (!data) {
      throw new BaseRepositoryException('Cannot save null or undefined data');
    }
    
    if (data._id) {
      const { _id, ...updateData } = data;
      const result = await this.update(_id.toString(), updateData as Partial<T>);
      if (!result) {
        throw new NotFoundException(`Document with ID ${_id} not found for update`);
      }
      return result;
    } else {
      return this.create(data as unknown as Omit<T, '_id'>);
    }
  }
  
  /**
   * Find one document matching a filter
   * @param filter Filter to apply
   * @param idFields Fields that should be treated as IDs
   * @returns Document or null if not found
   */
  async findOne(filter: any, idFields: string[] = ['_id']): Promise<T | null> {
    if (!filter || Object.keys(filter).length === 0) {
      this.logger.warn('findOne called with empty filter, returning null');
      return null;
    }
    
    try {
      const collection = await this.getCollection();
      const processedFilter = this.processFilter(filter, idFields);
      
      this.logger.debug(`Finding one document with filter: ${JSON.stringify(processedFilter)}`);
      
      const document = await collection.findOne(processedFilter);
      return document as T | null;
    } catch (error: any) {
      this.logger.error(`Error in findOne: ${error.message}`);
      throw new BaseRepositoryException(`Failed to find document: ${error.message}`);
    }
  }
  
  /**
   * Find documents by a specific field value
   * @param field Field name
   * @param value Field value
   * @param page Page number (1-based)
   * @param limit Number of items per page 
   * @returns Array of documents
   */
  async findByField(field: string, value: any, page = 1, limit = 10): Promise<T[]> {
    if (!field) {
      throw new BaseRepositoryException('Field name cannot be null or undefined');
    }
    
    const filter = { [field]: value };
    return this.findAll(filter, page, limit);
  }
}