import { Inject, Injectable } from '@nestjs/common';
import { IMenuItemDomainRepository } from './menu-item.repository.interface';
import { MenuItem } from '../../entities/menu-item.entity';
import { IMenuRepository } from '../../../repositories/menu/menu.repository.interface';
import { 
  MenuItemNotFoundException, 
  CategoryNotFoundException,
  AuthorizationException,
  ResourceConflictException
} from '../../exceptions';
import { EventBus } from '@nestjs/cqrs';
import { ObjectId } from 'mongodb';
import { Logger } from '@nestjs/common';

@Injectable()
export class MenuItemDomainRepository implements IMenuItemDomainRepository {
  private readonly logger = new Logger(MenuItemDomainRepository.name);

  constructor(
    @Inject('IMenuRepository') private readonly menuRepository: IMenuRepository,
    private readonly eventBus: EventBus
  ) {}

  async findById(id: string): Promise<MenuItem | null> {
    try {
      this.logger.debug(`Finding menu item by ID: ${id}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Parse the ID - try both ObjectId and string formats
      let objectId;
      let query;
      
      try {
        // First try to convert to ObjectId
        objectId = new ObjectId(id);
        
        // Query using $or to match either format
        query = {
          $or: [
            { _id: objectId },
            { _id: id.toString() }
          ]
        };
      } catch (error) {
        // If conversion fails, search by string ID only
        this.logger.debug(`ID ${id} is not a valid ObjectId, using string ID`);
        query = { _id: id.toString() };
      }
      
      this.logger.debug(`Executing query: ${JSON.stringify(query)}`);
      
      // Execute the query
      const item = await menuItemCollection.findOne(query);
      
      if (!item) {
        this.logger.debug(`Menu item with ID ${id} not found`);
        return null;
      }
      
      this.logger.debug(`Found menu item: ${JSON.stringify({
        id: item._id,
        name: item.name,
      })}`);
      
      return MenuItem.fromPersistence(item);
    } catch (error) {
      this.logger.error(`Error finding menu item by ID: ${error.message}`);
      return null;
    }
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<MenuItem[]> {
    try {
      this.logger.debug(`Finding menu items with filter: ${JSON.stringify(filter)}, page: ${page}, limit: ${limit}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query
      const query: any = {};
      
      // Apply filters only if they have actual values
      if (filter) {
        if (filter.available !== undefined) {
          query.available = filter.available;
        }
        if (filter.name) {
          query.name = new RegExp(filter.name, 'i');
        }
        // Add other filters as needed
      }
      
      // Apply pagination
      const skip = (page - 1) * limit;
      
      // Log the query we're using
      this.logger.debug(`Executing menu items query: ${JSON.stringify(query)}`);
      
      // Execute the query
      const items = await menuItemCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      this.logger.debug(`Found ${items.length} menu items from repository`);
      
      if (items.length === 0) {
        // Check if there are any items at all in the collection
        const totalCount = await menuItemCollection.countDocuments({});
        this.logger.debug(`Total menu items in collection: ${totalCount}`);
        
        if (totalCount > 0) {
          this.logger.debug(`Data exists in collection but no items match the filter`);
        } else {
          this.logger.debug(`No menu items exist in the collection at all`);
        }
      }
      
      // Convert to domain entities
      return items.map(item => MenuItem.fromPersistence(item));
    } catch (error) {
      this.logger.error(`Error in findAll menu items: ${error.message}`);
      throw error;
    }
  }

  async count(filter: any = {}): Promise<number> {
    try {
      this.logger.debug(`Counting menu items with filter: ${JSON.stringify(filter)}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query
      const query: any = {};
      
      // Apply filters
      if (filter) {
        if (filter.available !== undefined) {
          query.available = filter.available;
        }
        if (filter.name) {
          query.name = new RegExp(filter.name, 'i');
        }
        // Add other filters as needed
      }
      
      // Count matching documents
      const count = await menuItemCollection.countDocuments(query);
      
      this.logger.debug(`Found ${count} menu items matching the filter`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting menu items: ${error.message}`);
      throw error;
    }
  }

  async findByCategoryId(
    categoryId: string,
    filter: any = {},
    page = 1,
    limit = 10
  ): Promise<MenuItem[]> {
    try {
      this.logger.debug(`Finding menu items by categoryId: ${categoryId} with filter: ${JSON.stringify(filter)}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query
      const query: any = { categoryId: categoryId };
      
      // Apply filters
      if (filter) {
        if (filter.available !== undefined) {
          query.available = filter.available;
        }
        if (filter.name) {
          query.name = new RegExp(filter.name, 'i');
        }
        // Add other filters as needed
      }
      
      // Apply pagination
      const skip = (page - 1) * limit;
      
      // Execute the query
      const items = await menuItemCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      this.logger.debug(`Found ${items.length} menu items for category ${categoryId}`);
      
      // Convert to domain entities
      return items.map(item => MenuItem.fromPersistence(item));
    } catch (error) {
      this.logger.error(`Error finding menu items by categoryId: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count menu items by category ID
   */
  async countByCategoryId(categoryId: string, filter: any = {}): Promise<number> {
    try {
      this.logger.debug(`Counting menu items by categoryId: ${categoryId} with filter: ${JSON.stringify(filter)}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query
      const query: any = { categoryId: categoryId };
      
      // Apply filters
      if (filter) {
        if (filter.available !== undefined) {
          query.available = filter.available;
        }
        if (filter.name) {
          query.name = new RegExp(filter.name, 'i');
        }
        // Add other filters as needed
      }
      
      // Count matching documents
      const count = await menuItemCollection.countDocuments(query);
      this.logger.debug(`Found ${count} menu items by categoryId ${categoryId} matching the filter`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting menu items by category ID: ${error.message}`);
      throw error;
    }
  }

  async save(menuItem: MenuItem): Promise<MenuItem> {
    try {
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Convert menuItem to persistence format with complete data
      const menuItemData = menuItem.toPersistence();
      
      // Ensure the categoryId is properly set
      menuItemData.categoryId = menuItem.categoryId.toString();
      
      // Ensure arrays are properly initialized
      menuItemData.ingredients = Array.isArray(menuItemData.ingredients) ? menuItemData.ingredients : [];
      menuItemData.options = Array.isArray(menuItemData.options) ? menuItemData.options : [];
      menuItemData.tags = Array.isArray(menuItemData.tags) ? menuItemData.tags : [];
      menuItemData.images = Array.isArray(menuItemData.images) ? menuItemData.images : [];
      
      // Log data being saved
      this.logger.debug(`Saving menu item data: ${JSON.stringify({
        id: menuItemData._id,
        name: menuItemData.name,
        categoryId: menuItemData.categoryId
      })}`);
      
      // Check if this is a new menu item or an update
      let result;
      if (menuItemData._id) {
        this.logger.debug(`Updating existing menu item with ID: ${menuItemData._id}`);
        
        // Try to convert to ObjectId if possible
        let objectId;
        try {
          objectId = new ObjectId(menuItemData._id);
        } catch (error) {
          // If not a valid ObjectId, use as string
          objectId = menuItemData._id;
        }
        
        // Create update document without _id field
        const updateData = { ...menuItemData, updatedAt: new Date() };
        delete updateData._id; // Remove _id from the update data
        
        // This is an update - use findOneAndUpdate for atomicity
        result = await menuItemCollection.findOneAndUpdate(
          { _id: objectId },
          { $set: updateData },
          { returnDocument: 'after' }
        );
        
        // Check if we have a valid result
        // MongoDB driver may return either result.value or just the document itself
        let updatedDoc;
        if (result && result.value) {
          updatedDoc = result.value;
        } else if (result && !result.value) {
          // In newer MongoDB driver versions, the result may be the document itself
          updatedDoc = result;
        }
        
        if (!updatedDoc) {
          this.logger.error(`No document found after update for ID: ${menuItemData._id}`);
          
          // Try to fetch the document again to see if it exists
          updatedDoc = await menuItemCollection.findOne({ _id: objectId });
          if (!updatedDoc) {
            throw new MenuItemNotFoundException(menuItemData._id.toString());
          }
        }
        
        // Create a domain entity from the updated document
        const updatedMenuItem = MenuItem.fromPersistence(updatedDoc);
        
        // Publish any domain events
        this.publishEvents(menuItem);
        
        return updatedMenuItem;
      } else {
        // This is a new menu item, insert it
        this.logger.debug(`Creating new menu item: ${menuItemData.name}`);
        
        // Ensure dates are set
        menuItemData.createdAt = new Date();
        menuItemData.updatedAt = new Date();
        menuItemData.version = 0;
        
        // Remove the _id field for new items to let MongoDB generate one
        delete menuItemData._id;
        
        const insertResult = await menuItemCollection.insertOne(menuItemData);
        
        if (!insertResult.acknowledged) {
          throw new Error('Failed to insert menu item');
        }
        
        this.logger.debug(`Successfully created menu item with ID: ${insertResult.insertedId}`);
        
        // Fetch the inserted document
        const newDocument = await menuItemCollection.findOne({ _id: insertResult.insertedId });
        
        if (!newDocument) {
          throw new Error('Failed to retrieve inserted menu item');
        }
        
        // Create a domain entity from the new document
        const newMenuItem = MenuItem.fromPersistence(newDocument);
        
        // Publish any domain events
        this.publishEvents(menuItem);
        
        return newMenuItem;
      }
    } catch (error) {
      this.logger.error(`Error saving menu item: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting menu item with ID: ${id}`);
      
      // First find the item to ensure it exists and to call domain method if needed
      const menuItem = await this.findById(id);
      if (!menuItem) {
        throw new MenuItemNotFoundException(id);
      }
      
      // Get the collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Try to convert to ObjectId if possible
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (error) {
        // Continue with string ID
        objectId = id;
      }
      
      // Publish domain events before actual deletion
      this.publishEvents(menuItem);
      
      // Now perform the actual deletion
      const result = await menuItemCollection.deleteOne({ _id: objectId });
      
      if (result.deletedCount !== 1) {
        this.logger.warn(`Failed to delete menu item with ID ${id}`);
        throw new MenuItemNotFoundException(id);
      }
      
      this.logger.debug(`Menu item with ID ${id} successfully deleted`);
    } catch (error) {
      this.logger.error(`Error deleting menu item: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Publish all uncommitted events from the domain entity
   */
  private publishEvents(entity: MenuItem): void {
    // Get all uncommitted events from the entity
    const uncommittedEvents = entity.getUncommittedEvents();
    
    // Publish each event to the event bus
    uncommittedEvents.forEach(event => {
      this.eventBus.publish(event);
    });
    
    // Clear uncommitted events to prevent republishing
    entity.commit();
  }

  /**
   * Update a menu item by ID
   */
  async update(id: string, updatedMenuItem: MenuItem): Promise<MenuItem> {
    try {
      this.logger.log(`Updating menu item with ID: ${id}`);
      
      if (!id) {
        throw new Error('Menu item ID is required for update');
      }
      
      // Just save the updated entity directly - it already contains the changes
      const savedItem = await this.save(updatedMenuItem);
      
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
  }): Promise<MenuItem[]> {
    try {
      this.logger.debug(`Searching menu items with params: ${JSON.stringify(searchParams)}`);
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query
      const query: any = {};
      
      // Text search if query provided
      if (searchParams.query && searchParams.query.trim() !== '') {
        query.$text = { $search: searchParams.query };
      }
      
      // Category filter
      if (searchParams.categoryId) {
        try {
          const objectId = new ObjectId(searchParams.categoryId);
          query.categoryId = searchParams.categoryId;
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
      let findQuery = menuItemCollection.find(query);
      
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
      return items.map(item => MenuItem.fromPersistence(item));
    } catch (error) {
      this.logger.error(`Error in search menu items: ${error.message}`);
      throw error;
    }
  }

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
      
      // Get the menuItems collection directly
      const menuItemCollection = await this.menuRepository.getMenuItemCollection();
      
      // Build the query (same logic as in search method)
      const query: any = {};
      
      if (searchParams.query && searchParams.query.trim() !== '') {
        query.$text = { $search: searchParams.query };
      }
      
      if (searchParams.categoryId) {
        try {
          const objectId = new ObjectId(searchParams.categoryId);
          query.categoryId = searchParams.categoryId;
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
      const count = await menuItemCollection.countDocuments(query);
      
      this.logger.debug(`Found ${count} menu items matching the search criteria`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting search menu items: ${error.message}`);
      throw error;
    }
  }
} 