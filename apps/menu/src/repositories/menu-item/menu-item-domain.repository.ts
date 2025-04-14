import { Injectable, Logger } from '@nestjs/common';
import { CategoryRepository } from '../category';
import { MenuRepository } from '../menu/menu.repository';
import { MenuItem } from '../../schemas/menu-item/menu-item.schema';
import { MenuItem as MenuItemEntity } from '../../domain/entities/menu-item.entity';
import { CategoryNotFoundException } from '../../domain';
import { MongoDBService } from '@app/common/database/mongodb';
import { ObjectId } from 'mongodb';
import { IMenuItemDomainRepository } from '../../domain/repositories/menu-item/menu-item.repository.interface';

/**
 * Domain repository for menu items
 * Implements the domain repository interface while delegating persistence to infrastructure
 */
@Injectable()
export class MenuItemDomainRepository implements IMenuItemDomainRepository {
  private readonly logger = new Logger(MenuItemDomainRepository.name);
  private collection;

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly menuRepository: MenuRepository,
    private readonly mongoDBService: MongoDBService
  ) {}

  async onModuleInit() {
    this.collection = await this.mongoDBService.getCollection('menuItems');
  }

  /**
   * Find a menu item by ID
   */
  async findById(id: string): Promise<MenuItemEntity | null> {
    try {
      if (!id) {
        this.logger.error('findById called with null or undefined ID');
        return null;
      }

      const objectId = this.validateObjectId(id);
      if (!objectId) return null;

      const document = await this.collection.findOne({ _id: objectId });
      if (!document) {
        this.logger.debug(`Menu item with ID ${id} not found`);
        return null;
      }

      return this.mapToDomainEntity(document);
    } catch (error) {
      this.logger.error(`Error finding menu item by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Find all menu items with optional filtering
   */
  async findAll(filter: Record<string, any> = {}, page = 1, limit = 10): Promise<MenuItemEntity[]> {
    try {
      const skip = (page - 1) * limit;
      
      const documents = await this.collection
        .find(this.processFilter(filter))
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return documents.map(doc => this.mapToDomainEntity(doc));
    } catch (error) {
      this.logger.error(`Error finding menu items: ${error.message}`);
      return [];
    }
  }

  /**
   * Find menu items by category ID
   */
  async findByCategoryId(
    categoryId: string, 
    filter: Record<string, any> = {}, 
    page = 1, 
    limit = 10
  ): Promise<MenuItemEntity[]> {
    try {
      const objectId = this.validateObjectId(categoryId);
      if (!objectId) return [];

      const combinedFilter = { 
        ...filter,
        categoryId: objectId
      };
      
      return this.findAll(combinedFilter, page, limit);
    } catch (error) {
      this.logger.error(`Error finding menu items by category ID: ${error.message}`);
      return [];
    }
  }

  /**
   * Count menu items matching a filter
   */
  async count(filter: Record<string, any> = {}): Promise<number> {
    try {
      return await this.collection.countDocuments(this.processFilter(filter));
    } catch (error) {
      this.logger.error(`Error counting menu items: ${error.message}`);
      return 0;
    }
  }

  /**
   * Count menu items by category ID
   */
  async countByCategoryId(categoryId: string, filter: Record<string, any> = {}): Promise<number> {
    try {
      const objectId = this.validateObjectId(categoryId);
      if (!objectId) return 0;

      const combinedFilter = { 
        ...filter,
        categoryId: objectId
      };
      
      return this.count(combinedFilter);
    } catch (error) {
      this.logger.error(`Error counting menu items by category ID: ${error.message}`);
      return 0;
    }
  }

  /**
   * Delete a menu item by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const objectId = this.validateObjectId(id);
      if (!objectId) {
        throw new Error(`Invalid ObjectId: ${id}`);
      }

      this.logger.debug(`Deleting menu item: ${id}`);
      
      const result = await this.collection.deleteOne({ _id: objectId });
      
      if (result.deletedCount !== 1) {
        this.logger.warn(`Failed to delete menu item with ID ${id}`);
      } else {
        this.logger.debug(`Menu item deleted: ${id}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting menu item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save a menu item
   */
  async save(menuItem: MenuItemEntity): Promise<MenuItemEntity> {
    try {
      // Convert domain entity to document
      const documentData = this.mapToDocument(menuItem);
      const now = new Date();
      
      if (menuItem.id) {
        // Update existing document
        const objectId = this.validateObjectId(menuItem.id);
        if (!objectId) {
          throw new Error(`Invalid ObjectId: ${menuItem.id}`);
        }
        
        this.logger.debug(`Updating menu item: ${menuItem.id}`);
        
        const updateData = {
          ...documentData,
          updatedAt: now
        };
        
        const result = await this.collection.findOneAndUpdate(
          { _id: objectId },
          { $set: updateData },
          { returnDocument: 'after' }
        );
        
        if (!result.value) {
          throw new Error(`Failed to update menu item with ID ${menuItem.id}`);
        }
        
        return this.mapToDomainEntity(result.value);
      } else {
        // Create new document
        this.logger.debug('Creating new menu item');
        
        const insertData = {
          ...documentData,
          createdAt: now,
          updatedAt: now
        };
        
        const result = await this.collection.insertOne(insertData);
        
        if (!result.acknowledged || !result.insertedId) {
          throw new Error('Failed to insert menu item');
        }
        
        const newDocument = await this.collection.findOne({ _id: result.insertedId });
        
        if (!newDocument) {
          throw new Error('Failed to retrieve inserted menu item');
        }
        
        return this.mapToDomainEntity(newDocument);
      }
    } catch (error) {
      this.logger.error(`Error saving menu item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a filter object to convert string IDs to ObjectIds
   */
  private processFilter(filter: Record<string, any> = {}): Record<string, any> {
    const result = { ...filter };
    
    // Convert categoryId to ObjectId if it's a string
    if (filter.categoryId && typeof filter.categoryId === 'string') {
      try {
        result.categoryId = new ObjectId(filter.categoryId);
      } catch (error) {
        this.logger.warn(`Invalid categoryId format in filter: ${filter.categoryId}`);
      }
    }
    
    // Convert _id to ObjectId if it's a string
    if (filter._id && typeof filter._id === 'string') {
      try {
        result._id = new ObjectId(filter._id);
      } catch (error) {
        this.logger.warn(`Invalid _id format in filter: ${filter._id}`);
      }
    }
    
    return result;
  }

  /**
   * Validate and convert a string ID to an ObjectId
   */
  private validateObjectId(id: string): ObjectId | null {
    if (!id) {
      this.logger.error('ObjectId is null or undefined');
      return null;
    }
    
    try {
      return new ObjectId(id);
    } catch (error) {
      this.logger.error(`Invalid ObjectId format: ${id}`);
      return null;
    }
  }

  /**
   * Map a document to a domain entity
   */
  private mapToDomainEntity(doc: any): MenuItemEntity {
    try {
      // Create a base props object
      const props = {
        id: doc._id.toString(),
        categoryId: typeof doc.categoryId === 'string' 
          ? doc.categoryId 
          : doc.categoryId.toString(),
        name: doc.name,
        description: doc.description,
        price: doc.price,
        discountedPrice: doc.discountedPrice,
        available: doc.available,
        dietary: doc.dietary ? {
          vegetarian: Boolean(doc.dietary.vegetarian),
          vegan: Boolean(doc.dietary.vegan),
          glutenFree: Boolean(doc.dietary.glutenFree),
          nutFree: Boolean(doc.dietary.nutFree || doc.dietary.dairyFree)
        } : undefined
      };
      
      // Create a persistence object for fromPersistence
      const persistenceData = {
        ...props,
        images: doc.images || [],
        ingredients: doc.ingredients || [],
        tags: doc.tags || [],
        // Convert options to string array as expected by entity
        options: doc.options?.map(opt => opt.name) || [],
        featured: doc.featured,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        version: doc.version || 0
      };
      
      // Use the fromPersistence method
      return MenuItemEntity.fromPersistence(persistenceData);
    } catch (error) {
      this.logger.error(`Error mapping document to entity: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map a domain entity to a document
   */
  private mapToDocument(entity: MenuItemEntity): Record<string, any> {
    try {
      // Get the base data from entity's persistence method
      const persistenceData = entity.toPersistence();
      
      // Transform the options array to match document structure
      const optionsTransformed = entity.options.map(optionName => ({
        name: optionName,
        required: false,
        multiple: false,
        options: [{
          name: 'Default',
          price: 0
        }]
      }));
      
      // Map dietary info to match document structure
      const dietary = entity.dietary ? {
        vegetarian: entity.dietary.vegetarian,
        vegan: entity.dietary.vegan,
        glutenFree: entity.dietary.glutenFree,
        dairyFree: !entity.dietary.nutFree, // Approximate mapping
        nutFree: entity.dietary.nutFree
      } : undefined;
      
      // Return document structure
      return {
        ...persistenceData,
        options: optionsTransformed,
        dietary
      };
    } catch (error) {
      this.logger.error(`Error mapping entity to document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a menu item by ID
   */
  async update(id: string, updateData: any): Promise<MenuItemEntity> {
    try {
      this.logger.log(`Updating menu item with ID: ${id}`);
      
      if (!id) {
        throw new Error('Menu item ID is required for update');
      }
      
      // Verify the menu item exists
      const existingItem = await this.findById(id);
      if (!existingItem) {
        throw new Error(`Menu item with ID ${id} not found`);
      }
      
      this.logger.debug(`Found existing menu item to update: ${id}`);
      
      // Apply updates to the domain entity
      existingItem.updateDetails(updateData);
      
      // Save the updated entity
      const savedItem = await this.save(existingItem);
      
      if (!savedItem) {
        throw new Error(`Failed to save updated menu item with ID ${id}`);
      }
      
      this.logger.log(`Successfully updated menu item: ${id}`);
      return savedItem;
    } catch (error) {
      this.logger.error(`Error updating menu item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search menu items with text search and advanced filtering
   * @param searchParams Search parameters including query text and filters
   * @returns Promise resolving to an array of MenuItem entities
   */
  async search(searchParams: {
    query?: string;
    categoryId?: string;
    tags?: string[];
    dietary?: string[];
    priceRange?: { min?: number; max?: number };
    available?: boolean;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<MenuItemEntity[]> {
    try {
      this.logger.debug(`Searching menu items with params: ${JSON.stringify(searchParams)}`);
      
      // Build the query
      const query: any = {};
      
      // Text search if query provided
      if (searchParams.query && searchParams.query.trim() !== '') {
        query.$text = { $search: searchParams.query };
      }
      
      // Category filter
      if (searchParams.categoryId) {
        try {
          const objectId = this.validateObjectId(searchParams.categoryId);
          if (objectId) {
            query.categoryId = objectId;
          } else {
            query.categoryId = searchParams.categoryId;
          }
        } catch (error) {
          this.logger.warn(`Invalid categoryId format: ${searchParams.categoryId}, using as string`);
          query.categoryId = searchParams.categoryId;
        }
      }
      
      // Tags filter - match any tag in the array
      if (searchParams.tags && searchParams.tags.length > 0) {
        query.tags = { $in: searchParams.tags };
      }
      
      // Dietary restrictions filter
      if (searchParams.dietary && searchParams.dietary.length > 0) {
        const dietaryConditions = searchParams.dietary.map(diet => {
          return { [`dietary.${diet}`]: true };
        });
        
        if (dietaryConditions.length > 0) {
          query.$and = query.$and || [];
          query.$and.push({ $or: dietaryConditions });
        }
      }
      
      // Price range filter
      if (searchParams.priceRange) {
        query.price = {};
        
        if (searchParams.priceRange.min !== undefined) {
          query.price.$gte = searchParams.priceRange.min;
        }
        
        if (searchParams.priceRange.max !== undefined) {
          query.price.$lte = searchParams.priceRange.max;
        }
      }
      
      // Availability filter
      if (searchParams.available !== undefined) {
        query.available = searchParams.available;
      }
      
      // Featured filter
      if (searchParams.featured !== undefined) {
        query.featured = searchParams.featured;
      }
      
      // Prepare sorting
      const sortField = searchParams.sortBy || 'name';
      const sortOrder = searchParams.sortOrder === 'desc' ? -1 : 1;
      const sort: Record<string, number | { $meta: string }> = { [sortField]: sortOrder };
      
      // If using text search, include score in the sort
      if (query.$text) {
        sort.score = { $meta: 'textScore' };
      }
      
      // Apply pagination
      const page = searchParams.page || 1;
      const limit = searchParams.limit || 10;
      const skip = (page - 1) * limit;
      
      // Log the query we're using
      this.logger.debug(`Executing menu items search query: ${JSON.stringify(query)}`);
      this.logger.debug(`Sort: ${JSON.stringify(sort)}, Skip: ${skip}, Limit: ${limit}`);
      
      // Execute the query
      let findQuery = this.collection.find(query);
      
      // If using text search, include the score
      if (query.$text) {
        findQuery = findQuery.project({ score: { $meta: 'textScore' } });
      }
      
      const items = await findQuery
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      this.logger.debug(`Found ${items.length} menu items matching the search criteria`);
      
      // Convert to domain entities
      return items.map(doc => this.mapToDomainEntity(doc));
    } catch (error) {
      this.logger.error(`Error in search menu items: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count results for a search query
   * @param searchParams Search parameters
   * @returns Promise resolving to the count
   */
  async countSearch(searchParams: {
    query?: string;
    categoryId?: string;
    tags?: string[];
    dietary?: string[];
    priceRange?: { min?: number; max?: number };
    available?: boolean;
    featured?: boolean;
  }): Promise<number> {
    try {
      this.logger.debug(`Counting menu items with search params: ${JSON.stringify(searchParams)}`);
      
      // Build the query (same logic as in search method)
      const query: any = {};
      
      if (searchParams.query && searchParams.query.trim() !== '') {
        query.$text = { $search: searchParams.query };
      }
      
      if (searchParams.categoryId) {
        try {
          const objectId = this.validateObjectId(searchParams.categoryId);
          if (objectId) {
            query.categoryId = objectId;
          } else {
            query.categoryId = searchParams.categoryId;
          }
        } catch (error) {
          this.logger.warn(`Invalid categoryId format: ${searchParams.categoryId}, using as string`);
          query.categoryId = searchParams.categoryId;
        }
      }
      
      if (searchParams.tags && searchParams.tags.length > 0) {
        query.tags = { $in: searchParams.tags };
      }
      
      if (searchParams.dietary && searchParams.dietary.length > 0) {
        const dietaryConditions = searchParams.dietary.map(diet => {
          return { [`dietary.${diet}`]: true };
        });
        
        if (dietaryConditions.length > 0) {
          query.$and = query.$and || [];
          query.$and.push({ $or: dietaryConditions });
        }
      }
      
      if (searchParams.priceRange) {
        query.price = {};
        
        if (searchParams.priceRange.min !== undefined) {
          query.price.$gte = searchParams.priceRange.min;
        }
        
        if (searchParams.priceRange.max !== undefined) {
          query.price.$lte = searchParams.priceRange.max;
        }
      }
      
      if (searchParams.available !== undefined) {
        query.available = searchParams.available;
      }
      
      if (searchParams.featured !== undefined) {
        query.featured = searchParams.featured;
      }
      
      // Count matching documents
      const count = await this.collection.countDocuments(query);
      
      this.logger.debug(`Found ${count} menu items matching the search criteria`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting search menu items: ${error.message}`);
      throw error;
    }
  }
} 