import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoDBService } from '@app/common/database/mongodb';
import { IMenuRepository } from './menu.repository.interface';
import { CreateMenuDto, UpdateMenuDto } from '../dto';
import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';

@Injectable()
export class MenuRepository extends BaseRepository implements OnModuleInit, IMenuRepository {
  constructor(mongoDBService: MongoDBService) {
    super(mongoDBService, 'menus', MenuRepository.name);
  }

  async onModuleInit() {
    await super.onModuleInit();
  }

  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<any[]> {
    try {
      const objectId = this.validateObjectId(restaurantId);
      
      const filter: any = { restaurantId: objectId };
      if (activeOnly) {
        filter.active = true;
      }
      
      const collection = await this.getCollection();
      return collection.find(filter).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      this.logger.error(`Error finding menus by restaurant ID: ${error.message}`);
      return [];
    }
  }

  async create(createMenuDto: CreateMenuDto | any): Promise<any> {
    try {
      const now = new Date();
      
      // Log the input data
      this.logger.log(`Creating menu with data: ${JSON.stringify(createMenuDto)}`);
      
      // Convert restaurantId to ObjectId safely
      const restaurantObjectId = this.validateObjectId(createMenuDto.restaurantId);
      this.logger.log(`Converted restaurantId to ObjectId: ${restaurantObjectId}`);
      
      const menu = {
        ...createMenuDto,
        restaurantId: restaurantObjectId,
        categories: [],
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      
      // Log the menu object to be inserted
      this.logger.log(`Menu object to be inserted: ${JSON.stringify(menu)}`);
      
      // Get the collection and log its status
      const collection = await this.getCollection();
      this.logger.log(`Got collection: ${this.collectionName}, namespace: ${collection.namespace}`);
      
      // Log the MongoDB connection status
      const db = await this.mongoDBService.getDb();
      this.logger.log(`MongoDB connection status: ${db.databaseName}`);
      
      // Insert the menu
      this.logger.log('Inserting menu into MongoDB...');
      const result = await collection.insertOne(menu);
      
      // Log the result
      this.logger.log(`Insert result: ${JSON.stringify(result)}`);
      
      if (!result.insertedId) {
        this.logger.error('Failed to generate ID for menu');
        throw new Error('Failed to generate ID for menu');
      }
      
      // Fetch the complete document to ensure we have all fields
      this.logger.log(`Fetching saved menu with ID: ${result.insertedId}`);
      const savedMenu = await collection.findOne({ _id: result.insertedId });
      
      if (!savedMenu) {
        this.logger.error('Failed to retrieve saved menu');
        throw new Error('Failed to retrieve saved menu');
      }
      
      this.logger.log(`Successfully saved menu: ${JSON.stringify(savedMenu)}`);
      return savedMenu;
    } catch (error) {
      this.logger.error(`Error creating menu: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<any | null> {
    try {
      // Convert id to ObjectId safely
      const objectId = this.validateObjectId(id);
      
      const collection = await this.getCollection();
      
      // Log the update operation for debugging
      this.logger.debug(`Updating menu with ID ${id}`);
      
      // First check if the menu exists
      const existingMenu = await collection.findOne({ _id: objectId });
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
        { _id: objectId },
        { $set: updatedMenu }
      );
      
      if (updateResult.modifiedCount === 0) {
        this.logger.debug(`No document was modified for menu ID ${id}`);
        return null;
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: objectId });
    } catch (error) {
      this.logger.error(`Error updating menu: ${error.message}`);
      return null;
    }
  }

  async addCategory(menuId: string, categoryId: string): Promise<any | null> {
    try {
      // Convert menuId to ObjectId safely
      const menuObjectId = this.validateObjectId(menuId);
      
      // Convert categoryId to ObjectId safely
      const categoryObjectId = this.validateObjectId(categoryId);
      
      const collection = await this.getCollection();
      
      // First, find the menu
      const menu = await collection.findOne({ _id: menuObjectId });
      if (!menu) {
        this.logger.debug(`Menu with ID ${menuId} not found for adding category`);
        return null;
      }
      
      // Add the category if it doesn't exist
      if (!menu.categories) {
        menu.categories = [];
      }
      
      const categoryExists = menu.categories.some(
        (catId: any) => catId.toString() === categoryObjectId.toString()
      );
      
      if (!categoryExists) {
        menu.categories.push(categoryObjectId);
        menu.updatedAt = new Date();
        menu.version = (menu.version || 0) + 1;
        
        // Update the menu
        const updateResult = await collection.updateOne(
          { _id: menuObjectId },
          { $set: menu }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for menu ID ${menuId}`);
          return null;
        }
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: menuObjectId });
    } catch (error) {
      this.logger.error(`Error adding category to menu: ${error.message}`);
      return null;
    }
  }

  async removeCategory(menuId: string, categoryId: string): Promise<any | null> {
    try {
      // Convert menuId to ObjectId safely
      const menuObjectId = this.validateObjectId(menuId);
      
      // Convert categoryId to ObjectId safely
      const categoryObjectId = this.validateObjectId(categoryId);
      
      const collection = await this.getCollection();
      
      // First, find the menu
      const menu = await collection.findOne({ _id: menuObjectId });
      if (!menu) {
        this.logger.debug(`Menu with ID ${menuId} not found for removing category`);
        return null;
      }
      
      // Remove the category if it exists
      if (menu.categories && menu.categories.length > 0) {
        menu.categories = menu.categories.filter(
          (catId: any) => catId.toString() !== categoryObjectId.toString()
        );
        
        menu.updatedAt = new Date();
        menu.version = (menu.version || 0) + 1;
        
        // Update the menu
        const updateResult = await collection.updateOne(
          { _id: menuObjectId },
          { $set: menu }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for menu ID ${menuId}`);
          return null;
        }
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: menuObjectId });
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
          { _id: objectId },
          { $set: menu }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for menu ID ${menu._id}`);
          return null;
        }
        
        // Fetch and return the updated document
        return collection.findOne({ _id: objectId });
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

  async findMenuByItemId(itemId: string): Promise<any | null> {
    try {
      const collection = await this.getCollection();
      
      // Find all menus
      const menus = await collection.find().toArray();
      
      // Iterate through menus and their categories to find the item
      for (const menu of menus) {
        if (!menu.categories) continue;
        
        for (const category of menu.categories) {
          if (!category.items) continue;
          
          // Check if the item exists in this category
          const itemExists = category.items.some((item: any) => 
            item.id === itemId || item._id?.toString() === itemId
          );
          
          if (itemExists) {
            return menu;
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error finding menu by item ID: ${error.message}`);
      return null;
    }
  }
} 