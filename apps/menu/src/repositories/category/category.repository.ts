import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoDBService } from '@app/common/database/mongodb';
import { BaseRepository } from './../common';
import { ICategoryRepository } from './category.repository.interface';
import { ObjectId } from 'mongodb';
import { CreateCategoryDto, UpdateCategoryDto } from '../../dto';

@Injectable()
export class CategoryRepository extends BaseRepository implements OnModuleInit, ICategoryRepository {
  constructor(mongoDBService: MongoDBService) {
    super(mongoDBService, 'categories', CategoryRepository.name);
  }

  async findByMenuId(menuId: string, activeOnly = false): Promise<any[]> {
    try {
      const objectId = this.validateObjectId(menuId);
      
      const filter: any = { menuId: objectId };
      if (activeOnly) {
        filter.active = true;
      }
      
      const collection = await this.getCollection();
      return collection.find(filter).sort({ displayOrder: 1 }).toArray();
    } catch (error) {
      this.logger.error(`Error finding categories by menu ID: ${error.message}`);
      return [];
    }
  }

  async create(categoryData: CreateCategoryDto): Promise<any> {
    try {
      const now = new Date();
      
      // Convert menuId to ObjectId safely
      const menuObjectId = this.validateObjectId(categoryData.menuId);
      
      // Convert parentCategoryId to ObjectId if it exists
      let parentCategoryObjectId = null;
      if (categoryData.parentCategoryId) {
        parentCategoryObjectId = this.validateObjectId(categoryData.parentCategoryId);
      }
      
      const category = {
        ...categoryData,
        menuId: menuObjectId,
        parentCategoryId: parentCategoryObjectId,
        items: [],
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      
      const collection = await this.getCollection();
      const result = await collection.insertOne(category);
      return { ...category, _id: result.insertedId };
    } catch (error) {
      this.logger.error(`Error creating category: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateData: UpdateCategoryDto): Promise<any | null> {
    try {
      const objectId = this.validateObjectId(id);
      
      const collection = await this.getCollection();
      
      // First check if the category exists
      const existingCategory = await collection.findOne({ _id: objectId });
      if (!existingCategory) {
        this.logger.debug(`Category with ID ${id} not found for update`);
        return null;
      }
      
      // Create a copy of the update data to avoid modifying the original
      const updateDataCopy = { ...updateData };
      
      // Handle parentCategoryId if it exists
      if (updateDataCopy.parentCategoryId) {
        const parentCategoryObjectId = this.validateObjectId(updateDataCopy.parentCategoryId);
        // Store the ObjectId in a separate property to avoid type conflicts
        (existingCategory as any).parentCategoryObjectId = parentCategoryObjectId;
        // Remove the string version to avoid conflicts
        delete updateDataCopy.parentCategoryId;
      }
      
      // Create a new updated category object
      const updatedCategory = {
        ...existingCategory,
        ...updateDataCopy,
        updatedAt: new Date(),
        version: (existingCategory.version || 0) + 1
      };
      
      const updateResult = await collection.updateOne(
        { _id: objectId },
        { $set: updatedCategory }
      );
      
      if (updateResult.modifiedCount === 0) {
        this.logger.debug(`No document was modified for category ID ${id}`);
        return null;
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: objectId });
    } catch (error) {
      this.logger.error(`Error updating category: ${error.message}`);
      return null;
    }
  }

  async save(category: any): Promise<any> {
    try {
      const collection = await this.getCollection();
      
      // Check if the category has an _id
      if (category._id) {
        // If it has an _id, it's an update
        let objectId;
        try {
          objectId = typeof category._id === 'string' ? new ObjectId(category._id) : category._id;
        } catch (error) {
          this.logger.error(`Invalid ObjectId format: ${category._id}`);
          return null;
        }
        
        // Update the category
        category.updatedAt = new Date();
        category.version = (category.version || 0) + 1;
        
        const updateResult = await collection.updateOne(
          { _id: objectId },
          { $set: category }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for category ID ${category._id}`);
          return null;
        }
        
        // Fetch and return the updated document
        return collection.findOne({ _id: objectId });
      } else {
        // If it doesn't have an _id, it's a new category
        const now = new Date();
        const newCategory = {
          ...category,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        
        const result = await collection.insertOne(newCategory);
        return { ...newCategory, _id: result.insertedId };
      }
    } catch (error) {
      this.logger.error(`Error saving category: ${error.message}`);
      return null;
    }
  }

  async addItem(categoryId: string, itemId: string): Promise<any | null> {
    try {
      const categoryObjectId = this.validateObjectId(categoryId);
      const itemObjectId = this.validateObjectId(itemId);
      
      const collection = await this.getCollection();
      
      // First, find the category
      const category = await collection.findOne({ _id: categoryObjectId });
      if (!category) {
        this.logger.debug(`Category with ID ${categoryId} not found for adding item`);
        return null;
      }
      
      // Add the item if it doesn't exist
      if (!category.items) {
        category.items = [];
      }
      
      const itemExists = category.items.some(
        (id: any) => id.toString() === itemObjectId.toString()
      );
      
      if (!itemExists) {
        category.items.push(itemObjectId);
        category.updatedAt = new Date();
        category.version = (category.version || 0) + 1;
        
        // Update the category
        const updateResult = await collection.updateOne(
          { _id: categoryObjectId },
          { $set: category }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for category ID ${categoryId}`);
          return null;
        }
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: categoryObjectId });
    } catch (error) {
      this.logger.error(`Error adding item to category: ${error.message}`);
      return null;
    }
  }

  async removeItem(categoryId: string, itemId: string): Promise<any | null> {
    try {
      const categoryObjectId = this.validateObjectId(categoryId);
      const itemObjectId = this.validateObjectId(itemId);
      
      const collection = await this.getCollection();
      
      // First, find the category
      const category = await collection.findOne({ _id: categoryObjectId });
      if (!category) {
        this.logger.debug(`Category with ID ${categoryId} not found for removing item`);
        return null;
      }
      
      // Remove the item if it exists
      if (category.items && category.items.length > 0) {
        category.items = category.items.filter(
          (id: any) => id.toString() !== itemObjectId.toString()
        );
        
        category.updatedAt = new Date();
        category.version = (category.version || 0) + 1;
        
        // Update the category
        const updateResult = await collection.updateOne(
          { _id: categoryObjectId },
          { $set: category }
        );
        
        if (updateResult.modifiedCount === 0) {
          this.logger.debug(`No document was modified for category ID ${categoryId}`);
          return null;
        }
      }
      
      // Fetch the updated document
      return collection.findOne({ _id: categoryObjectId });
    } catch (error) {
      this.logger.error(`Error removing item from category: ${error.message}`);
      return null;
    }
  }
} 