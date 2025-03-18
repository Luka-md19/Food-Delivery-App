import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BaseService } from '@app/common';
import { Category as CategorySchema } from '../schemas';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from '../dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class CategoryService extends BaseService {
  protected readonly logger: Logger;
  
  constructor(
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any,
    @Inject('IMenuDomainRepository') private readonly menuDomainRepository: any,
    @Inject('IMenuItemDomainRepository') private readonly menuItemDomainRepository: any
  ) {
    super(CategoryService.name);
  }

  // Explicitly define the inherited methods to satisfy TypeScript
  protected validateObjectId(id: string): void {
    super.validateObjectId(id);
  }

  protected validatePagination(page = 1, limit = 10, maxLimit = 100): { page: number, limit: number } {
    return super.validatePagination(page, limit, maxLimit);
  }

  protected handleError(error: any, message: string, knownErrorTypes: any[] = []): never {
    return super.handleError(error, message, knownErrorTypes);
  }

  async findAll(page = 1, limit = 10, filter: Partial<CategorySchema> = {}): Promise<{
    items: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const pagination = this.validatePagination(page, limit);
      
      this.logger.log(`Finding categories with page=${pagination.page}, limit=${pagination.limit}, filter=${JSON.stringify(filter)}`);
      
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
      return this.handleError(error, 'Failed to retrieve categories');
    }
  }

  async findByMenuId(menuId: string, activeOnly = false): Promise<CategoryResponseDto[]> {
    try {
      this.validateObjectId(menuId);
      
      this.logger.log(`Finding categories for menu ID: ${menuId}, activeOnly=${activeOnly}`);
      
      const categories = await this.categoryDomainRepository.findByMenuId(menuId, activeOnly);
      
      return categories.map(category => this.mapToDto(category));
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve categories');
    }
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Finding category by ID: ${id}`);
      
      const category = await this.categoryDomainRepository.findById(id);
      
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      
      return this.mapToDto(category);
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve category', [NotFoundException]);
    }
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      this.validateObjectId(createCategoryDto.menuId);
      
      if (createCategoryDto.parentCategoryId) {
        this.validateObjectId(createCategoryDto.parentCategoryId);
      }
      
      this.logger.log(`Creating category: ${JSON.stringify(createCategoryDto)}`);
      
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
      return this.handleError(error, 'Failed to create category', [NotFoundException]);
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    try {
      this.validateObjectId(id);
      
      if (updateCategoryDto.parentCategoryId) {
        this.validateObjectId(updateCategoryDto.parentCategoryId);
      }
      
      this.logger.log(`Updating category ${id}: ${JSON.stringify(updateCategoryDto)}`);
      
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
      return this.handleError(error, 'Failed to update category', [NotFoundException]);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Deleting category: ${id}`);
      
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
      return this.handleError(error, 'Failed to delete category', [NotFoundException, BadRequestException]);
    }
  }

  async addItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    try {
      this.validateObjectId(categoryId);
      this.validateObjectId(itemId);
      
      this.logger.log(`Adding item ${itemId} to category ${categoryId}`);
      
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
      return this.handleError(error, 'Failed to add item to category', [NotFoundException]);
    }
  }

  async removeItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    try {
      this.validateObjectId(categoryId);
      this.validateObjectId(itemId);
      
      this.logger.log(`Removing item ${itemId} from category ${categoryId}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      const updatedCategory = await this.categoryDomainRepository.removeItem(categoryId, itemId);
      
      return this.mapToDto(updatedCategory);
    } catch (error) {
      return this.handleError(error, 'Failed to remove item from category', [NotFoundException]);
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