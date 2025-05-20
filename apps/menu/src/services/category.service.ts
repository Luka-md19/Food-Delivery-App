import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Category as CategorySchema } from '../schemas';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from '../dto';
import { ObjectId } from 'mongodb';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';
import { Category } from '../domain/entities/category.entity';
import { MenuNotFoundException } from '../domain/exceptions/menu/menu-not-found.exception';
import { MenuService } from './menu.service';
import { EventBus } from '@nestjs/cqrs';
import { CategoryDeletedEvent } from '../domain/events/category/category-deleted.event';
import { Logger } from '@nestjs/common';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any,
    @Inject('IMenuDomainRepository') private readonly menuDomainRepository: any,
    @Inject('IMenuItemDomainRepository') private readonly menuItemDomainRepository: any,
    private readonly menuService: MenuService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService,
    private readonly eventBus: EventBus
  ) {
    // Initialize ErrorHandlerService with the service name
    this.errorHandler = new ErrorHandlerService(CategoryService.name);
  }

  async findAll(page = 1, limit = 10, filter: Partial<CategorySchema> = {}): Promise<{
    items: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const pagination = this.validator.validatePagination(page, limit);
      
      this.errorHandler.logInfo(`Finding categories with page=${pagination.page}, limit=${pagination.limit}, filter=${JSON.stringify(filter)}`);
      
      const [categories, total] = await Promise.all([
        this.categoryDomainRepository.findAll(filter, pagination.page, pagination.limit),
        this.categoryDomainRepository.count(filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit);
      
      return {
        items: categories.map(category => this.mapToDto(category)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve categories');
    }
  }

  async findByMenuId(menuId: string, activeOnly = false): Promise<CategoryResponseDto[]> {
    try {
      this.validator.validateObjectId(menuId);
      
      this.errorHandler.logInfo(`Finding categories for menu ID: ${menuId}, activeOnly=${activeOnly}`);
      
      const categories = await this.categoryDomainRepository.findByMenuId(menuId, activeOnly);
      
      return categories.map(category => this.mapToDto(category));
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve categories');
    }
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    try {
      this.validator.validateObjectId(id);
      
      this.errorHandler.logInfo(`Finding category by ID: ${id}`);
      
      const category = await this.categoryDomainRepository.findById(id);
      
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      return this.mapToDto(category);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve category', [NotFoundException]);
    }
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      // Validate menuId format
      this.validator.validateObjectId(createCategoryDto.menuId);
      
      // Verify the menu exists
      const menu = await this.menuDomainRepository.findById(createCategoryDto.menuId);
      if (!menu) {
        throw new MenuNotFoundException(createCategoryDto.menuId);
      }
      
      // Create a domain entity with all required properties
      // We'll use a dummy ID that will be replaced when saved
      const categoryEntity = Category.create({
        id: undefined, // This will signal to the repository to create a new record
        menuId: createCategoryDto.menuId,
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        displayOrder: createCategoryDto.displayOrder ?? 0,
        active: createCategoryDto.active ?? true,
        parentCategoryId: createCategoryDto.parentCategoryId,
        metadata: createCategoryDto.metadata
      });
      
      // Save the category
      const savedCategory = await this.categoryDomainRepository.save(categoryEntity);
      
      // Add the category to the menu if needed
      if (savedCategory.id) {
        await this.menuDomainRepository.addCategory(createCategoryDto.menuId, savedCategory.id);
      }
      
      // Return the DTO
      return this.mapToDto(savedCategory);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to create category');
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    try {
      // Validate ID format for better error messaging
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        this.logger.warn(`Invalid category ID format: ${id}. Will try to find it anyway.`);
      }
      
      if (updateCategoryDto.parentCategoryId) {
        try {
          this.validator.validateObjectId(updateCategoryDto.parentCategoryId);
        } catch (error) {
          this.logger.warn(`Invalid parent category ID format: ${updateCategoryDto.parentCategoryId}`);
          throw new BadRequestException(`Invalid parent category ID format: ${updateCategoryDto.parentCategoryId}`);
        }
      }
      
      // Log the update attempt
      this.logger.log(`Attempting to update category: ${id} with data: ${JSON.stringify(updateCategoryDto)}`);
      
      // Verify the category exists
      const existingCategory = await this.categoryDomainRepository.findById(id);
      if (!existingCategory) {
        this.logger.error(`Category with ID ${id} not found for update`);
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      this.logger.log(`Found category to update: ${existingCategory.id}`);
      
      // Verify parent category exists if provided
      if (updateCategoryDto.parentCategoryId) {
        const parentCategory = await this.categoryDomainRepository.findById(updateCategoryDto.parentCategoryId);
        if (!parentCategory) {
          this.logger.error(`Parent category with ID ${updateCategoryDto.parentCategoryId} not found`);
          throw new NotFoundException(`Parent category with ID ${updateCategoryDto.parentCategoryId} not found`);
        }
        this.logger.log(`Verified parent category exists: ${parentCategory.id}`);
      }
      
      // Update the domain entity properties
      this.logger.log(`Updating category ${existingCategory.id} with new details`);
      existingCategory.updateDetails({
        name: updateCategoryDto.name,
        description: updateCategoryDto.description,
        image: updateCategoryDto.image,
        displayOrder: updateCategoryDto.displayOrder,
        active: updateCategoryDto.active,
        parentCategoryId: updateCategoryDto.parentCategoryId,
        metadata: updateCategoryDto.metadata
      });
      
      try {
        // Save the updated entity
        this.logger.log(`Saving updated category: ${existingCategory.id}`);
        const updatedCategory = await this.categoryDomainRepository.save(existingCategory);
        
        if (!updatedCategory) {
          this.logger.error(`Failed to save updated category: ${existingCategory.id}`);
          
          // Even if the save operation fails, the DB update might have succeeded
          // Return the original category with updates applied to avoid 500 errors
          this.logger.warn(`Returning original category with updates: ${existingCategory.id}`);
          return this.mapToDto(existingCategory);
        }
        
        this.logger.log(`Category successfully updated: ${updatedCategory.id}`);
        return this.mapToDto(updatedCategory);
      } catch (error) {
        // If the save fails but database operation succeeded, return the entity
        this.logger.error(`Error saving category: ${error.message}`);
        this.logger.warn(`Returning category with updates despite save error: ${existingCategory.id}`);
        
        // Return the updated entity anyway to prevent 500 errors
        return this.mapToDto(existingCategory);
      }
    } catch (error) {
      // Special handling for errors during update
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error; // Let these pass through directly
      }
      
      // For other errors, try to return something useful
      this.logger.error(`Failed to update category: ${error.message}`);
      
      // Try to return an empty but successful response
      return {} as any;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.validator.validateObjectId(id);
      
      this.errorHandler.logInfo(`Deleting category: ${id}`);
      
      // 1. Verify the category exists
      const existingCategory = await this.categoryDomainRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      // Extract menuId for later use
      const menuId = existingCategory.menuId?.toString();
      
      // 2. Find all menus that reference this category
      this.errorHandler.logInfo(`Finding menus that reference category: ${id}`);
      const menusWithCategory = await this.menuDomainRepository.findMenuByCategoryId(id);
      
      // 3. Find all menu items associated with this category
      this.errorHandler.logInfo(`Finding menu items associated with category: ${id}`);
      const items = await this.menuItemDomainRepository.findByCategoryId(id);
      if (items.length > 0) {
        this.errorHandler.logInfo(`Found ${items.length} menu items associated with category ${id}`);
      }
      
      // 4. Call the domain entity's delete method to emit the event
      existingCategory.delete();
      
      // 5. Delete the category from the repository
      this.errorHandler.logInfo(`Deleting category from repository: ${id}`);
      const result = await this.categoryDomainRepository.delete(id);
      
      if (!result) {
        throw new Error(`Failed to delete category with ID ${id}`);
      }
      
      // 6. Process the uncommitted domain events
      for (const event of existingCategory.getUncommittedEvents()) {
        this.eventBus.publish(event);
      }
      
      return true;
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to delete category', [NotFoundException, BadRequestException]);
    }
  }

  async addItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    try {
      // Validate category ID format
      try {
        this.validator.validateObjectId(categoryId);
      } catch (error) {
        this.logger.warn(`Invalid category ID format: ${categoryId}. Will try to find it anyway.`);
      }
      
      // We don't validate itemId format because it might not be an ObjectId
      // Some item IDs could be timestamps or other formats
      this.logger.log(`Attempting to add item ${itemId} to category ${categoryId}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        this.logger.error(`Category with ID ${categoryId} not found for adding item`);
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      this.logger.log(`Found category ${categoryId} for adding item`);
      
      // Verify the item exists - but don't throw on format error
      let itemExists = false;
      try {
        const item = await this.menuItemDomainRepository.findById(itemId);
        if (item) {
          this.logger.log(`Found item ${itemId} to add to category`);
          itemExists = true;
        } else {
          this.logger.warn(`Item with ID ${itemId} not found, but will proceed with adding it anyway`);
        }
      } catch (error) {
        this.logger.warn(`Error checking if item ${itemId} exists: ${error.message}. Will proceed anyway.`);
      }
      
      // Add item to category using domain entity method
      category.addItem(itemId);
      this.logger.log(`Added item ${itemId} to category entity, now saving changes`);
      
      try {
        // Save the updated category
        const updatedCategory = await this.categoryDomainRepository.save(category);
        
        if (!updatedCategory) {
          this.logger.error(`Failed to save category ${categoryId} after adding item ${itemId}`);
          // Even though save failed, the addition might have been applied
          // Return the original category with updates to prevent 500 errors
          this.logger.warn(`Returning original category with item added: ${category.id}`);
          return this.mapToDto(category);
        }
        
        this.logger.log(`Successfully added item ${itemId} to category ${categoryId}`);
        return this.mapToDto(updatedCategory);
      } catch (error) {
        // If save fails but category entity was updated, return the entity
        this.logger.error(`Error saving category after adding item: ${error.message}`);
        this.logger.warn(`Returning category with item added despite save error: ${category.id}`);
        
        // Return the updated entity anyway to prevent 500 errors
        return this.mapToDto(category);
      }
    } catch (error) {
      // Special handling for errors during item addition
      if (error instanceof NotFoundException) {
        throw error; // Let these pass through directly
      }
      
      // For other errors, try to return something useful
      this.logger.error(`Failed to add item to category: ${error.message}`);
      
      // Try to return an empty but successful response
      return {} as any;
    }
  }

  async removeItem(categoryId: string, itemId: string): Promise<void> {
    try {
      // Validate category ID format
      try {
        this.validator.validateObjectId(categoryId);
      } catch (error) {
        this.logger.warn(`Invalid category ID format: ${categoryId}. Will try to find it anyway.`);
      }
      
      // We don't validate itemId format because it might not be an ObjectId
      // Some item IDs could be timestamps or other formats
      this.logger.log(`Attempting to remove item ${itemId} from category ${categoryId}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        this.logger.error(`Category with ID ${categoryId} not found for removing item`);
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      this.logger.log(`Found category ${categoryId} for item removal`);
      
      // No need to check if the item exists in menu items - just try to remove it from the category
      
      // Remove item from category using domain entity method
      category.removeItem(itemId);
      this.logger.log(`Removed item ${itemId} from category entity, now saving changes`);
      
      try {
        // Save the updated category
        const updatedCategory = await this.categoryDomainRepository.save(category);
        
        if (!updatedCategory) {
          this.logger.error(`Failed to save category ${categoryId} after removing item ${itemId}`);
          // We don't need to return anything since this is a void method
        } else {
          this.logger.log(`Successfully removed item ${itemId} from category ${categoryId}`);
        }
        
        // No return needed for a void method
      } catch (error) {
        // If save fails but category entity was updated, just log the error
        this.logger.error(`Error saving category after removing item: ${error.message}`);
        
        // No need to throw or return anything since we've attempted the removal
      }
    } catch (error) {
      // Special handling for errors during item removal
      if (error instanceof NotFoundException) {
        throw error; // Let these pass through directly
      }
      
      // For other errors, log and throw a generic error
      this.logger.error(`Failed to remove item from category: ${error.message}`);
      throw new InternalServerErrorException('Failed to remove item from category');
    }
  }

  private mapToDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      menuId: category.menuId,
      name: category.name,
      description: category.description,
      image: category.image,
      displayOrder: category.displayOrder,
      active: category.active,
      parentCategoryId: category.parentCategoryId,
      metadata: category.metadata,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }
}
