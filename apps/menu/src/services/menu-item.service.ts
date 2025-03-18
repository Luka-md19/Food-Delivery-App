import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BaseService } from '@app/common';
import { MenuItem as MenuItemSchema } from '../schemas';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemResponseDto } from '../dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class MenuItemService extends BaseService {
  protected readonly logger: Logger;
  
  constructor(
    @Inject('IMenuItemDomainRepository') private readonly menuItemDomainRepository: any,
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any
  ) {
    super(MenuItemService.name);
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

  async findAll(page = 1, limit = 10, filter: Partial<MenuItemSchema> = {}): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const pagination = this.validatePagination(page, limit);
      
      this.logger.log(`Finding menu items with page=${pagination.page}, limit=${pagination.limit}, filter=${JSON.stringify(filter)}`);
      
      const [items, total] = await Promise.all([
        this.menuItemDomainRepository.findAll(filter, pagination.page, pagination.limit),
        this.menuItemDomainRepository.count(filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit);
      
      return {
        items: items.map(item => this.mapToDto(item)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menu items');
    }
  }

  async findByCategoryId(categoryId: string, page = 1, limit = 10, filter: Partial<MenuItemSchema> = {}): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      this.validateObjectId(categoryId);
      
      const pagination = this.validatePagination(page, limit);
      
      this.logger.log(`Finding menu items for category ID: ${categoryId}, page=${pagination.page}, limit=${pagination.limit}, filter=${JSON.stringify(filter)}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      const [items, total] = await Promise.all([
        this.menuItemDomainRepository.findByCategoryId(categoryId, filter, pagination.page, pagination.limit),
        this.menuItemDomainRepository.countByCategoryId(categoryId, filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit);
      
      return {
        items: items.map(item => this.mapToDto(item)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menu items', [NotFoundException]);
    }
  }

  async findById(id: string): Promise<MenuItemResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Finding menu item by ID: ${id}`);
      
      const item = await this.menuItemDomainRepository.findById(id);
      
      if (!item) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      return this.mapToDto(item);
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menu item', [NotFoundException]);
    }
  }

  async create(createItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      this.validateObjectId(createItemDto.categoryId);
      
      this.logger.log(`Creating menu item: ${JSON.stringify(createItemDto)}`);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(createItemDto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${createItemDto.categoryId} not found`);
      }
      
      const item = await this.menuItemDomainRepository.create(createItemDto);
      
      // Add the item to the category
      await this.categoryDomainRepository.addItem(createItemDto.categoryId, item.id);
      
      return this.mapToDto(item);
    } catch (error) {
      return this.handleError(error, 'Failed to create menu item', [NotFoundException]);
    }
  }

  async update(id: string, updateItemDto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Updating menu item ${id}: ${JSON.stringify(updateItemDto)}`);
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // If changing category, verify the new category exists
      if (updateItemDto.categoryId && updateItemDto.categoryId !== existingItem.categoryId) {
        this.validateObjectId(updateItemDto.categoryId);
        
        const newCategory = await this.categoryDomainRepository.findById(updateItemDto.categoryId);
        if (!newCategory) {
          throw new NotFoundException(`Category with ID ${updateItemDto.categoryId} not found`);
        }
        
        // Remove from old category and add to new category
        await this.categoryDomainRepository.removeItem(existingItem.categoryId, id);
        await this.categoryDomainRepository.addItem(updateItemDto.categoryId, id);
      }
      
      const updatedItem = await this.menuItemDomainRepository.update(id, updateItemDto);
      
      return this.mapToDto(updatedItem);
    } catch (error) {
      return this.handleError(error, 'Failed to update menu item', [NotFoundException]);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Deleting menu item: ${id}`);
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Remove from category
      await this.categoryDomainRepository.removeItem(existingItem.categoryId, id);
      
      // Delete the item
      await this.menuItemDomainRepository.delete(id);
      
      return true;
    } catch (error) {
      return this.handleError(error, 'Failed to delete menu item', [NotFoundException]);
    }
  }

  async updateAvailability(id: string, available: boolean): Promise<MenuItemResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Updating menu item availability for ${id}: ${available}`);
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      const updatedItem = await this.menuItemDomainRepository.update(id, { available });
      
      return this.mapToDto(updatedItem);
    } catch (error) {
      return this.handleError(error, 'Failed to update menu item availability', [NotFoundException]);
    }
  }

  private mapToDto(item: any): MenuItemResponseDto {
    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      images: item.images,
      price: item.price,
      discountedPrice: item.discountedPrice,
      currency: item.currency,
      preparationTime: item.preparationTime,
      calories: item.calories,
      spicyLevel: item.spicyLevel,
      dietary: item.dietary,
      ingredients: item.ingredients,
      options: item.options,
      available: item.available,
      featured: item.featured,
      tags: item.tags,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
} 