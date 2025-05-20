import { Injectable, Inject, Logger } from '@nestjs/common';
import { ICategoryRepository } from '../../../repositories/category/category.repository.interface';
import { IMenuRepository } from '../../../repositories/menu/menu.repository.interface';
import { ICategoryDomainRepository } from './category.repository.interface';
import { Category } from '../../entities/category.entity';
import { CategoryNotFoundException, ResourceConflictException, ValidationException } from '../../exceptions';
import { EventBus } from '@nestjs/cqrs';
import { ObjectId } from 'mongodb';

/**
 * Implementation of the domain repository interface for categories
 * This adapts the existing infrastructure repository to work with domain entities
 */
@Injectable()
export class CategoryDomainRepository implements ICategoryDomainRepository {
  private readonly logger = new Logger(CategoryDomainRepository.name);

  constructor(
    @Inject('ICategoryRepository') private readonly categoryRepository: ICategoryRepository,
    @Inject('IMenuRepository') private readonly menuRepository: IMenuRepository,
    private readonly eventBus: EventBus
  ) {}

  async findById(id: string): Promise<Category | null> {
    const categoryData = await this.categoryRepository.findById(id);
    if (!categoryData) {
      return null;
    }
    
    return Category.fromPersistence(categoryData);
  }

  async findByMenuId(menuId: string, activeOnly = false): Promise<Category[]> {
    const categoriesData = await this.categoryRepository.findByMenuId(menuId, activeOnly);
    return categoriesData.map(categoryData => Category.fromPersistence(categoryData));
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<Category[]> {
    try {
      this.logger.debug(`Finding categories with filter: ${JSON.stringify(filter)}, page: ${page}, limit: ${limit}`);
      
      // Get direct access to the collection to bypass any layers that might filter data
      const collection = await this.categoryRepository.getCategoryCollection();
      
      // Create a clean filter object to avoid unwanted filtering
      const cleanFilter: any = {};
      
      // Only copy actual specified filters, ignore empty ones
      if (filter) {
        // Only include active status if explicitly set
        if (filter.active !== undefined) {
          cleanFilter.active = filter.active;
        }
        
        // Handle specific menuId filter if provided
        if (filter.menuId) {
          try {
            // Try to convert to ObjectId
            cleanFilter.menuId = new ObjectId(filter.menuId);
          } catch (error) {
            // Fall back to string if not valid ObjectId
            this.logger.warn(`Invalid menuId ObjectId format: ${filter.menuId}, using as string`);
            cleanFilter.menuId = filter.menuId;
          }
        }
      }
      
      this.logger.debug(`Using clean filter for categories: ${JSON.stringify(cleanFilter)}`);
      
      // Apply pagination
      const skip = (page - 1) * limit;
      
      // Get categories with direct collection access
      const categoriesData = await collection
        .find(cleanFilter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      // Log count for debugging
      this.logger.debug(`Found ${categoriesData.length} categories from collection`);
      
      if (categoriesData.length === 0) {
        // Check if there are any categories at all in the collection
        const totalCount = await collection.countDocuments({});
        this.logger.debug(`Total categories in collection: ${totalCount}`);
        
        if (totalCount > 0) {
          this.logger.debug(`Data exists in collection but no categories match the filter`);
        } else {
          this.logger.debug(`No categories exist in the collection at all`);
        }
      }
      
      // Convert directly to domain entities
      return categoriesData.map(category => Category.fromPersistence(category));
    } catch (error) {
      this.logger.error(`Error in findAll categories: ${error.message}`);
      throw error;
    }
  }

  async count(filter: any = {}): Promise<number> {
    try {
      this.logger.debug(`Counting categories with filter: ${JSON.stringify(filter)}`);
      
      // Get the direct count from the repository without additional filtering
      const count = await this.categoryRepository.count(filter);
      
      this.logger.debug(`Found ${count} categories matching the filter`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting categories: ${error.message}`);
      throw error;
    }
  }

  async save(category: Category): Promise<Category> {
    try {
      const categoryData = category.toPersistence();
      
      // If the category has an ID, update it; otherwise, create it
      if (categoryData._id) {
        // This is an update operation
        const { _id, ...updateData } = categoryData;
        const idString = _id.toString();
        
        this.logger.debug(`Save operation - attempting to update category with ID: ${idString}`);
        
        // First try to find the category directly through the repository
        const existingCategory = await this.categoryRepository.findById(idString);
        
        if (existingCategory) {
          this.logger.debug(`Found category for update via findById: ${existingCategory._id}`);
          
          // Update the category using the exact _id from the found document
          const updatedCategoryData = await this.categoryRepository.update(
            existingCategory._id.toString(),
            updateData
          );
          
          if (!updatedCategoryData) {
            this.logger.error(`Category with ID ${idString} failed to update via findById method`);
            // Don't throw here - try the fallback approach below
          } else {
            // Publish domain events
            this.publishEvents(category);
            
            this.logger.debug(`Category updated successfully via standard method: ${updatedCategoryData._id}`);
            return Category.fromPersistence(updatedCategoryData);
          }
        }
        
        // If not found via findById, try using direct collection access
        this.logger.debug(`Category not found by direct ID or update failed, trying alternative approaches for ${idString}`);
        
        // Get direct access to the MongoDB collection
        const collection = await this.categoryRepository.getCategoryCollection();
        if (!collection) {
          this.logger.error('Failed to get category collection');
          throw new CategoryNotFoundException(idString);
        }
        
        // Try multiple query options
        const categoryDoc = await collection.findOne({
          $or: [
            { _id: new ObjectId(idString) },
            { _id: idString }
          ]
        });
        
        if (!categoryDoc) {
          this.logger.error(`Category with ID ${idString} not found using any method`);
          throw new CategoryNotFoundException(idString);
        }
        
        this.logger.debug(`Found category using direct collection access: ${categoryDoc._id}`);
        
        // Update the category using the exact _id from MongoDB
        const result = await collection.updateOne(
          { _id: categoryDoc._id },
          { $set: { ...updateData, updatedAt: new Date() } }
        );
        
        if (result.modifiedCount === 0) {
          this.logger.error(`Failed to update category ${idString} via direct collection access`);
          // Even if update fails, if we found the document, return it without changes
          // Don't throw an exception here since the document exists
          this.logger.warn(`Returning existing category without changes: ${categoryDoc._id}`);
          
          // Publish domain events anyway
          this.publishEvents(category);
          
          return Category.fromPersistence(categoryDoc);
        }
        
        // Fetch the updated document
        const updatedDoc = await collection.findOne({ _id: categoryDoc._id });
        if (!updatedDoc) {
          this.logger.error(`Could not retrieve updated category ${idString}`);
          // If we can't retrieve it, but update succeeded, return the original entity
          this.logger.warn(`Returning category entity without confirmation: ${idString}`);
          
          // Publish domain events anyway
          this.publishEvents(category);
          
          return category;
        }
        
        // Publish domain events
        this.publishEvents(category);
        
        this.logger.debug(`Category updated successfully using direct collection access: ${updatedDoc._id}`);
        return Category.fromPersistence(updatedDoc);
      } else {
        // For new categories, we need to create a new ID
        if (!categoryData.menuId) {
          throw new ValidationException('menuId', 'Menu ID is required for creating a category');
        }
        
        // Create a new category
        const createdCategoryData = await this.categoryRepository.create(categoryData);
        
        if (!createdCategoryData) {
          throw new ResourceConflictException('category', 'new', 'Failed to create category');
        }
        
        // Publish domain events
        this.publishEvents(category);
        
        return Category.fromPersistence(createdCategoryData);
      }
    } catch (error) {
      // Rethrow domain exceptions or wrap infrastructure errors
      if (error instanceof CategoryNotFoundException || 
          error instanceof ResourceConflictException ||
          error instanceof ValidationException) {
        throw error;
      }
      throw new ResourceConflictException('category', 
        category.id || 'new', 
        `Failed to save category: ${error.message}`
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Attempting to delete category with ID: ${id}`);
      
      // Fetch the category first to emit domain events
      const category = await this.findById(id);
      if (!category) {
        throw new CategoryNotFoundException(id);
      }
      
      // Apply domain logic before deletion if needed
      // If the entity has a delete method that emits events, call it here
      
      // Publish any events before actual deletion
      this.publishEvents(category);
      
      const deleted = await this.categoryRepository.delete(id);
      if (!deleted) {
        throw new ResourceConflictException('category', id, 'Failed to delete category');
      }
      
      this.logger.debug(`Successfully deleted category with ID: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting category: ${error.message}`);
      throw error;
    }
  }
  
  async addItem(categoryId: string, itemId: string): Promise<Category> {
    try {
      this.logger.debug(`Adding item ${itemId} to category ${categoryId}`);
      
      // First find the category to ensure it exists
      const category = await this.findById(categoryId);
      if (!category) {
        throw new CategoryNotFoundException(categoryId);
      }
      
      // Use the domain entity to add the item, which will record events
      category.addItem(itemId);
      
      // Save the updated category
      const updatedCategory = await this.save(category);
      
      if (!updatedCategory) {
        throw new Error(`Failed to save category ${categoryId} after adding item ${itemId}`);
      }
      
      this.logger.debug(`Successfully added item ${itemId} to category ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Error adding item to category: ${error.message}`);
      throw error;
    }
  }
  
  async removeItem(categoryId: string, itemId: string): Promise<Category> {
    try {
      this.logger.debug(`Removing item ${itemId} from category ${categoryId}`);
      
      // First find the category to ensure it exists
      const category = await this.findById(categoryId);
      if (!category) {
        throw new CategoryNotFoundException(categoryId);
      }
      
      // Use the domain entity to remove the item, which will record events
      category.removeItem(itemId);
      
      // Save the updated category
      const updatedCategory = await this.save(category);
      
      if (!updatedCategory) {
        throw new Error(`Failed to save category ${categoryId} after removing item ${itemId}`);
      }
      
      this.logger.debug(`Successfully removed item ${itemId} from category ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Error removing item from category: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Publish all uncommitted events from the domain entity
   */
  private publishEvents(entity: Category): void {
    // Get all uncommitted events from the entity
    const uncommittedEvents = entity.getUncommittedEvents();
    
    // Publish each event to the event bus
    uncommittedEvents.forEach(event => {
      this.eventBus.publish(event);
    });
    
    // Clear uncommitted events to prevent republishing
    entity.commit();
  }
} 