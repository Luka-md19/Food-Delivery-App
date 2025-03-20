import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Category as CategorySchema } from '../schemas';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from '../dto';
import { ObjectId } from 'mongodb';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any,
    @Inject('IMenuDomainRepository') private readonly menuDomainRepository: any,
    @Inject('IMenuItemDomainRepository') private readonly menuItemDomainRepository: any,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService
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
      this.validator.validateObjectId(createCategoryDto.menuId);
      
      if (createCategoryDto.parentCategoryId) {
        this.validator.validateObjectId(createCategoryDto.parentCategoryId);
      }
      
      this.errorHandler.logInfo(`Creating category: ${JSON.stringify(createCategoryDto)}`);
      
      // Verify the menu exists
      const menu = await this.menuDomainRepository.findById(createCategoryDto.menuId);
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${createCategoryDto.menuId} not found`);
      }
      
      // Verify parent category exists if provided
      if (createCategoryDto.parentCategoryId) {
        const parentCategory = await this.categoryDomainRepository.findById(createCategoryDto.parentCategoryId);
        if (!parentCategory) {
          throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentCategoryId} not found`);
        }
      }
      
      const category = await this.categoryDomainRepository.create(createCategoryDto);
      
      return this.mapToDto(category);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to create category', [NotFoundException]);
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    try {
      this.validator.validateObjectId(id);
      
      if (updateCategoryDto.parentCategoryId) {
        this.validator.validateObjectId(updateCategoryDto.parentCategoryId);
      }
      
      this.errorHandler.logInfo(`Updating category ${id}: ${JSON.stringify(updateCategoryDto)}`);
      
      // Verify the category exists
      const existingCategory = await this.categoryDomainRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      // Verify parent category exists if provided
      if (updateCategoryDto.parentCategoryId) {
        const parentCategory = await this.categoryDomainRepository.findById(updateCategoryDto.parentCategoryId);
        if (!parentCategory) {
          throw new NotFoundException(`Parent category with ID ${updateCategoryDto.parentCategoryId} not found`);
        }
      }
      
      const updatedCategory = await this.categoryDomainRepository.update(id, updateCategoryDto);
      
      return this.mapToDto(updatedCategory);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to update category', [NotFoundException]);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.validator.validateObjectId(id);
      
      this.errorHandler.logInfo(`Deleting category: ${id}`);
      
      // Verify the category exists
      const existingCategory = await this.categoryDomainRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      // Need to check if category has items
      const items = await this.menuItemDomainRepository.findByCategoryId(id);
      if (items.length > 0) {
        throw new BadRequestException(`Cannot delete category with associated items. Remove items first.`);
      }
      
      await this.categoryDomainRepository.delete(id);
      
      return true;
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to delete category', [NotFoundException, BadRequestException]);
    }
  }

  async addItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    try {
      this.validator.validateObjectId(categoryId);
      this.validator.validateObjectId(itemId);
      
      this.errorHandler.logInfo(`Adding item ${itemId} to category ${categoryId}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      // Verify the item exists
      const item = await this.menuItemDomainRepository.findById(itemId);
      if (!item) {
        throw new NotFoundException(`Menu item with ID ${itemId} not found`);
      }
      
      const updatedCategory = await this.categoryDomainRepository.addItem(categoryId, itemId);
      
      return this.mapToDto(updatedCategory);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to add item to category', [NotFoundException]);
    }
  }

  async removeItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    try {
      this.validator.validateObjectId(categoryId);
      this.validator.validateObjectId(itemId);
      
      this.errorHandler.logInfo(`Removing item ${itemId} from category ${categoryId}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      const updatedCategory = await this.categoryDomainRepository.removeItem(categoryId, itemId);
      
      return this.mapToDto(updatedCategory);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to remove item from category', [NotFoundException]);
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