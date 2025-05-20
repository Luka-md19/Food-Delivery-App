import { Injectable } from '@nestjs/common';
import { MongoDBService } from '@app/common/database/mongodb';
import { BaseDocument } from '@app/common/database/mongodb/mongo.types';
import { ObjectId } from 'mongodb';
import { BaseRepository } from '../common/base.repository';
import { ICategoryRepository } from './category.repository.interface';
import { CreateCategoryDto, UpdateCategoryDto } from '../../dto';

/**
 * Document interface for Category in MongoDB
 */
export interface CategoryDocument extends BaseDocument {
  menuId: string | ObjectId;
  name: string;
  description?: string;
  image?: string;
  displayOrder?: number;
  active?: boolean;
  items?: string[] | ObjectId[];
  parentCategoryId?: string | ObjectId;
  metadata?: Record<string, any>;
}

/**
 * Repository for category operations
 */
@Injectable()
export class CategoryRepository extends BaseRepository<CategoryDocument> implements ICategoryRepository {
  constructor(protected readonly mongoDBService: MongoDBService) {
    super(mongoDBService, 'categories', CategoryRepository.name);
  }

  /**
   * Find categories by menu ID
   * @param menuId Menu ID
   * @param activeOnly Whether to return only active categories
   * @returns Array of category documents
   */
  async findByMenuId(menuId: string, activeOnly = false): Promise<CategoryDocument[]> {
    try {
      let filter: any = {};
      
      try {
        // Try to convert to ObjectId
        filter.menuId = this.validateObjectId(menuId);
      } catch (error) {
        // Fall back to string if not a valid ObjectId
        filter.menuId = menuId;
      }
      
      if (activeOnly) {
        filter.active = true;
      }
      
      // Sort by displayOrder
      const categories = await this.findAll(filter);
      return categories.sort((a, b) => {
        const orderA = a.displayOrder ?? 0;
        const orderB = b.displayOrder ?? 0;
        return orderA - orderB;
      });
    } catch (error) {
      this.logger.error(`Error finding categories by menu ID: ${error.message}`);
      return [];
    }
  }

  /**
   * Add an item to a category
   * @param categoryId Category ID
   * @param itemId Item ID to add
   * @returns Updated category or null if category not found
   */
  async addItem(categoryId: string, itemId: string): Promise<CategoryDocument | null> {
    try {
      // Get the category
      const category = await this.findById(categoryId);
      if (!category) {
        return null;
      }
      
      // Initialize items array if it doesn't exist
      if (!category.items) {
        category.items = [];
      }
      
      // Check if item already exists in the category
      const itemExists = category.items.some(id => 
        id.toString() === itemId.toString()
      );
      
      // If item already exists, return category as is
      if (itemExists) {
        return category;
      }
      
      // Add the item to the category
      await this.collection.updateOne(
        { _id: this.validateObjectId(categoryId) } as any,
        { $addToSet: { items: itemId } }
      );
      
      // Get the updated category
      return this.findById(categoryId);
    } catch (error) {
      this.logger.error(`Error adding item to category: ${error.message}`);
      return null;
    }
  }

  /**
   * Remove an item from a category
   * @param categoryId Category ID
   * @param itemId Item ID to remove
   * @returns Updated category or null if category not found
   */
  async removeItem(categoryId: string, itemId: string): Promise<CategoryDocument | null> {
    try {
      // Get the category
      const category = await this.findById(categoryId);
      if (!category) {
        return null;
      }
      
      // If category has no items, return it as is
      if (!category.items || category.items.length === 0) {
        return category;
      }
      
      // Remove the item from the category
      await this.collection.updateOne(
        { _id: this.validateObjectId(categoryId) } as any,
        { $pull: { items: itemId } as any }
      );
      
      // Get the updated category
      return this.findById(categoryId);
    } catch (error) {
      this.logger.error(`Error removing item from category: ${error.message}`);
      return null;
    }
  }

  async create(categoryData: CreateCategoryDto): Promise<CategoryDocument | null> {
    try {
      // Process and validate the menuId
      if (!categoryData.menuId) {
        throw new Error('menuId is required for category creation');
      }
      
      // Prepare document with proper types
      const docData: Omit<CategoryDocument, '_id'> = {
        menuId: this.validateObjectId(categoryData.menuId),
        name: categoryData.name,
        description: categoryData.description,
        image: categoryData.image,
        displayOrder: categoryData.displayOrder,
        active: categoryData.active ?? true,
        items: [],
        metadata: categoryData.metadata
      };
      
      // Handle parentCategoryId if present
      if (categoryData.parentCategoryId) {
        docData.parentCategoryId = this.validateObjectId(categoryData.parentCategoryId);
      }
      
      return super.create(docData);
    } catch (error) {
      this.logger.error(`Error in CategoryRepository.create: ${error.message}`);
      return null;
    }
  }

  async getCategoryCollection(): Promise<any> {
    return this.mongoDBService.getCollection('categories');
  }
} 