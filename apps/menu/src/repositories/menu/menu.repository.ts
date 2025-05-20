import { Injectable, OnModuleInit, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { MongoDBService, BaseRepository, BaseDocument } from '@app/common/database/mongodb';
import { IMenuRepository } from './menu.repository.interface';
import { CreateMenuDto, UpdateMenuDto } from '../../dto';
import { ObjectId } from 'mongodb';

// Define the Menu document type for MongoDB
export interface MenuDocument extends BaseDocument {
  restaurantId: string | ObjectId;
  name: string;
  description?: string;
  active?: boolean;
  availability?: {
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
  };
  categories?: string[] | ObjectId[];
  metadata?: Record<string, any>;
}

// Update the DTO to include categories
export interface ExtendedUpdateMenuDto extends UpdateMenuDto {
  categories?: string[] | ObjectId[];
}

@Injectable()
export class MenuRepository extends BaseRepository<MenuDocument> implements IMenuRepository, OnModuleInit {
  constructor(protected readonly mongoDBService: MongoDBService) {
    super(mongoDBService, 'menus', MenuRepository.name);
  }

  async onModuleInit() {
    await super.onModuleInit();
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<any[]> {
    try {
      // Process the filter to handle ObjectIds consistently
      const processedFilter: Record<string, any> = {};
      
      this.logger.debug(`Finding menus with filter: ${JSON.stringify(filter)}, page: ${page}, limit: ${limit}`);
      
      if (filter && typeof filter === 'object') {
        Object.keys(filter).forEach(key => {
          if (filter[key] === undefined) {
            return; // Skip undefined values
          }
          
          // Special handling for ID fields
          if ((key === '_id' || key === 'restaurantId') && typeof filter[key] === 'string') {
            try {
              processedFilter[key] = new ObjectId(filter[key]);
              this.logger.debug(`Converted ${key} to ObjectId: ${processedFilter[key]}`);
            } catch (error) {
              // If not a valid ObjectId, use the original string
              this.logger.debug(`Invalid ObjectId format for ${key}: ${filter[key]}, using as string`);
              processedFilter[key] = filter[key];
            }
          } else if (key === 'categories' && Array.isArray(filter[key])) {
            // Handle categories array
            processedFilter[key] = filter[key].map((catId: string) => {
              if (typeof catId === 'string') {
                try {
                  return new ObjectId(catId);
                } catch (error) {
                  return catId;
                }
              }
              return catId;
            });
          } else {
            processedFilter[key] = filter[key];
          }
        });
      }
      
      const collection = await this.getCollection();
      
      // Ensure valid pagination
      const pagination = this.validator.validatePagination(page, limit);
      const skip = (pagination.page - 1) * pagination.limit;
      
      this.logger.debug(`Using processed filter: ${JSON.stringify(processedFilter)}, skip: ${skip}, limit: ${pagination.limit}`);
      
      // Use a more flexible query with $or for ID fields if they exist in the filter
      let finalQuery = processedFilter;
      
      if (processedFilter._id) {
        const idValue = processedFilter._id;
        finalQuery = {
          ...processedFilter,
          $or: [
            { _id: idValue },
            { _id: idValue.toString() }
          ]
        };
        delete finalQuery._id; // Remove the original _id since we're using $or
      }
      
      // Execute the query with the processed filter
      const results = await collection
        .find(finalQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .toArray();
      
      this.logger.debug(`Found ${results.length} menus matching the criteria`);
      
      // If no results, try a basic query to check if any menus exist
      if (results.length === 0) {
        const totalCount = await collection.countDocuments({});
        this.logger.debug(`Total menus in collection: ${totalCount}`);
      }
      
      // Deep copy to ensure we don't modify the original documents
      const resultsCopy = results.map(menu => ({...menu}));
      return resultsCopy;
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`);
      return [];
    }
  }

  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<MenuDocument[]> {
    try {
      let filter: any = {};
      
      try {
        // Try to convert to ObjectId
        filter.restaurantId = this.validateObjectId(restaurantId);
      } catch (error) {
        // Fall back to string if not a valid ObjectId
        filter.restaurantId = restaurantId;
      }
      
      if (activeOnly) {
        filter.active = true;
      }
      
      this.logger.debug(`Finding menus by restaurant ID: ${restaurantId}, activeOnly=${activeOnly}`);
      
      return this.findAll(filter);
    } catch (error) {
      this.logger.error(`Error finding menus by restaurant ID: ${error.message}`);
      return [];
    }
  }

  async create(createMenuDto: CreateMenuDto): Promise<MenuDocument> {
    try {
      // Convert restaurant ID to ObjectId if possible
      let restaurantId = createMenuDto.restaurantId;
      
      if (restaurantId) {
        try {
          restaurantId = this.validateObjectId(restaurantId).toString();
        } catch (error) {
          // Use as string if not a valid ObjectId
        }
      }
      
      // Create menu document
      const menuDoc: Partial<MenuDocument> = {
        name: createMenuDto.name,
        description: createMenuDto.description || '',
        restaurantId: restaurantId,
        active: createMenuDto.active !== undefined ? createMenuDto.active : true,
        availability: createMenuDto.availability,
        metadata: createMenuDto.metadata,
        categories: [],
      };
      
      // Use base repository create method
      const result = await super.create(menuDoc as MenuDocument);
      return result;
    } catch (error) {
      this.logger.error(`Error creating menu: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateMenuDto: UpdateMenuDto | ExtendedUpdateMenuDto): Promise<any | null> {
    try {
      // Convert id to ObjectId safely
      const objectId = this.validateObjectId(id);
      
      const collection = await this.getCollection();
      
      // Log the update operation for debugging
      this.logger.debug(`Updating menu with ID ${id}`);
      
      // First check if the menu exists
      const existingMenu = await collection.findOne({ _id: objectId } as any);
      if (!existingMenu) {
        this.logger.debug(`Menu with ID ${id} not found for update`);
        return null;
      }
      
      // Create a new updated menu object
      const updatedMenu = {
        ...existingMenu,
        ...updateMenuDto,
        updatedAt: new Date(),
        version: (existingMenu.version || 0) + 1
      };
      
      // Use updateOne instead of findOneAndUpdate
      const updateResult = await collection.updateOne(
        { _id: objectId } as any,
        { $set: updatedMenu }
      );
      
      if (updateResult.modifiedCount === 0) {
        this.logger.debug(`No document was modified for menu ID ${id}`);
        return null;
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: objectId } as any);
    } catch (error) {
      this.logger.error(`Error updating menu: ${error.message}`);
      return null;
    }
  }

  async addCategory(menuId: string, categoryId: string): Promise<MenuDocument | null> {
    try {
      // Get the menu by ID
      const menu = await this.findById(menuId);
      if (!menu) {
        return null;
      }
      
      // Initialize categories array if it doesn't exist
      if (!menu.categories) {
        menu.categories = [];
      }
      
      // Check if category already exists in the menu
      const categoryExists = menu.categories.some(catId => 
        catId.toString() === categoryId.toString()
      );
      
      // If category already exists, return the menu as is
      if (categoryExists) {
        return menu;
      }
      
      // Add the category ID to the menu
      await this.collection.updateOne(
        { _id: this.validateObjectId(menuId) } as any,
        { $addToSet: { categories: categoryId } }
      );
      
      // Get the updated menu
      return this.findById(menuId);
    } catch (error) {
      this.logger.error(`Error adding category to menu: ${error.message}`);
      return null;
    }
  }

  async removeCategory(menuId: string, categoryId: string): Promise<MenuDocument | null> {
    try {
      // Get the menu by ID
      const menu = await this.findById(menuId);
      if (!menu) {
        return null;
      }
      
      // If the menu has no categories, return it as is
      if (!menu.categories || menu.categories.length === 0) {
        return menu;
      }
      
      // Remove the category ID from the menu
      await this.collection.updateOne(
        { _id: this.validateObjectId(menuId) } as any,
        { $pull: { categories: categoryId } as any }
      );
      
      // Get the updated menu
      return this.findById(menuId);
    } catch (error) {
      this.logger.error(`Error removing category from menu: ${error.message}`);
      return null;
    }
  }

  async getMenuWithCategoriesAndItems(menuId: string): Promise<any> {
    const objectId = this.validateObjectId(menuId);
    const collection = await this.getCollection();
    
    return collection.aggregate([
      { $match: { _id: objectId } },
      { $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: "menuItems",
          localField: "categoryDetails._id",
          foreignField: "categoryId",
          as: "categoryDetails.items"
        }
      },
      { $group: {
          _id: "$_id",
          name: { $first: "$name" },
          description: { $first: "$description" },
          // Include other fields
          categories: { $push: "$categoryDetails" }
        }
      }
    ]).toArray();
  }

  async save(menu: any): Promise<any> {
    try {
      const collection = await this.getCollection();
      
      // Check if the menu has an _id
      if (menu._id) {
        // If it has an _id, it's an update
        let objectId;
        try {
          objectId = typeof menu._id === 'string' ? new ObjectId(menu._id) : menu._id;
        } catch (error) {
          this.logger.error(`Invalid ObjectId format: ${menu._id}`);
          return null;
        }
        
        // Update the menu
        menu.updatedAt = new Date();
        menu.version = (menu.version || 0) + 1;
        
        const updateResult = await collection.updateOne(
          { _id: objectId } as any,
          { $set: menu }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for menu ID ${menu._id}`);
          return null;
        }
        
        // Fetch and return the updated document
        return collection.findOne({ _id: objectId } as any);
      } else {
        // If it doesn't have an _id, it's a new menu
        const now = new Date();
        const newMenu = {
          ...menu,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        
        const result = await collection.insertOne(newMenu);
        return { ...newMenu, _id: result.insertedId };
      }
    } catch (error) {
      this.logger.error(`Error saving menu: ${error.message}`);
      return null;
    }
  }

  async findMenuByItemId(itemId: string): Promise<MenuDocument[]> {
    try {
      // First get the item to find its category
      const itemsCollection = await this.mongoDBService.getCollection('menuItems');
      
      let itemObjectId;
      try {
        itemObjectId = this.validateObjectId(itemId);
      } catch (error) {
        // Continue with string ID
      }
      
      // Create a query that checks for both ObjectId and string representations
      const query = {
        $or: [
          { _id: itemObjectId },
          { _id: itemId }
        ]
      };
      
      const item = await itemsCollection.findOne(query);
      
      if (!item) {
        return [];
      }
      
      // Find menu that has this item's category
      const categoryId = item.categoryId;
      if (!categoryId) {
        return [];
      }
      
      return this.findMenuByCategoryId(categoryId.toString());
    } catch (error) {
      this.logger.error(`Error finding menu by item ID: ${error.message}`);
      return [];
    }
  }

  async findMenuByCategoryId(categoryId: string): Promise<MenuDocument[]> {
    try {
      let categoryObjectId;
      
      try {
        categoryObjectId = this.validateObjectId(categoryId);
      } catch (error) {
        // Use string ID if not a valid ObjectId
      }
      
      // Create a query that checks for both ObjectId and string representations
      const query = {
        $or: [
          { categories: { $in: [categoryObjectId] } },
          { categories: { $in: [categoryId] } }
        ]
      };
      
      // Get the collection
      const collection = await this.getCollection();
      
      // Find menus with this category
      const menus = await collection.find(query).toArray();
      return menus as MenuDocument[];
    } catch (error) {
      this.logger.error(`Error finding menu by category ID: ${error.message}`);
      return [];
    }
  }

  async count(filter: any = {}): Promise<number> {
    try {
      // Process the filter to convert string IDs to ObjectIds if needed
      const processedFilter: any = {};
      
      // Handle restaurant ID conversion if present
      if (filter.restaurantId && typeof filter.restaurantId === 'string') {
        try {
          processedFilter.restaurantId = new ObjectId(filter.restaurantId);
        } catch (error) {
          this.logger.error(`Invalid restaurantId format: ${filter.restaurantId}`);
        }
      }
      
      // Handle _id conversion if present
      if (filter._id && typeof filter._id === 'string') {
        try {
          processedFilter._id = new ObjectId(filter._id);
        } catch (error) {
          this.logger.error(`Invalid _id format: ${filter._id}`);
        }
      }
      
      // Copy non-ID filters directly
      Object.keys(filter).forEach(key => {
        if (!['restaurantId', '_id'].includes(key)) {
          processedFilter[key] = filter[key];
        }
      });
      
      const collection = await this.getCollection();
      
      // Execute the count with processed filter
      return collection.countDocuments(processedFilter);
    } catch (error) {
      this.logger.error(`Error in count: ${error.message}`);
      return 0;
    }
  }

  async getCategoryCollection(): Promise<any> {
    return this.mongoDBService.getCollection('categories');
  }

  async getMenuItemCollection(): Promise<any> {
    return this.mongoDBService.getCollection('menuItems');
  }
} 