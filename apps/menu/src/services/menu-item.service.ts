import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { MenuItem as MenuItemSchema, OptionType } from '../schemas';
import { 
  CreateMenuItemDto, 
  UpdateMenuItemDto, 
  MenuItemResponseDto, 
  CreateOptionTypeDto, 
  UpdateOptionTypeDto,
  OptionTypeDto
} from '../dto';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';
import { MenuItem } from '../domain/entities/menu-item.entity';
import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class MenuItemService {
  private readonly logger = new Logger(MenuItemService.name);

  constructor(
    @Inject('IMenuItemDomainRepository') private readonly menuItemDomainRepository: any,
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService,
    private readonly eventBus: EventBus
  ) {
    // Initialize ErrorHandlerService with the service name
    this.errorHandler = new ErrorHandlerService(MenuItemService.name);
  }

  async findAll(page = 1, limit = 10, filter: Partial<MenuItemSchema> = {}): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const pagination = this.validator.validatePagination(page, limit);
      
      const [items, total] = await Promise.all([
        this.menuItemDomainRepository.findAll(filter, pagination.page, pagination.limit),
        this.menuItemDomainRepository.count(filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit) || 1;
      
      return {
        items: items.map(item => this.mapToDto(item)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menu items');
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
      try {
        this.validator.validateObjectId(categoryId);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      const pagination = this.validator.validatePagination(page, limit);
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      const [items, total] = await Promise.all([
        this.menuItemDomainRepository.findByCategoryId(categoryId, filter, pagination.page, pagination.limit),
        this.menuItemDomainRepository.countByCategoryId(categoryId, filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit) || 1;
      
      return {
        items: items.map(item => this.mapToDto(item)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menu items for category', [NotFoundException]);
    }
  }

  async findById(id: string): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      const item = await this.menuItemDomainRepository.findById(id);
      
      if (!item) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      return this.mapToDto(item);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menu item', [NotFoundException]);
    }
  }

  async create(createItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      this.logger.debug(`Creating menu item: ${createItemDto.name} for category: ${createItemDto.categoryId}`);
      
      try {
        this.validator.validateObjectId(createItemDto.categoryId);
      } catch (error) {
        this.logger.warn(`Invalid category ID format: ${createItemDto.categoryId}, but will continue`);
        // Continue even with invalid ID format
      }
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(createItemDto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${createItemDto.categoryId} not found`);
      }
      
      // Convert DTOs to schema types if needed
      const options = createItemDto.options?.map(option => ({
        name: option.name,
        description: option.description,
        required: option.required,
        multiple: option.multiple,
        minSelections: option.minSelections,
        maxSelections: option.maxSelections,
        displayOrder: option.displayOrder,
        values: option.values.map(value => ({
          name: value.name,
          price: value.price,
          available: value.available !== undefined ? value.available : true,
          description: value.description,
          externalId: value.externalId
        }))
      })) as OptionType[];
      
      // Create a new MenuItem entity
      const menuItem = MenuItem.create({
        id: undefined, // Let the repository generate an ID
        categoryId: createItemDto.categoryId,
        name: createItemDto.name,
        description: createItemDto.description,
        images: createItemDto.images,
        price: createItemDto.price,
        discountedPrice: createItemDto.discountedPrice,
        currency: createItemDto.currency,
        preparationTime: createItemDto.preparationTime,
        calories: createItemDto.calories,
        spicyLevel: createItemDto.spicyLevel,
        available: createItemDto.available,
        dietary: createItemDto.dietary,
        ingredients: createItemDto.ingredients,
        options: options,
        featured: createItemDto.featured,
        tags: createItemDto.tags,
        metadata: createItemDto.metadata
      });
      
      this.logger.debug('About to save menu item to repository');
      
      // Save the menu item
      const savedMenuItem = await this.menuItemDomainRepository.save(menuItem);
      
      if (!savedMenuItem) {
        throw new Error('Failed to save menu item');
      }
      
      this.logger.debug(`Successfully saved menu item with ID: ${savedMenuItem.id}`);
      
      // Add the item to the category
      try {
        await this.categoryDomainRepository.addItem(createItemDto.categoryId, savedMenuItem.id);
        this.logger.debug(`Added menu item ${savedMenuItem.id} to category ${createItemDto.categoryId}`);
      } catch (addError) {
        this.logger.warn(`Error adding item to category: ${addError.message}`);
        // Continue since the item was created successfully, even if we couldn't add it to the category
      }
      
      return this.mapToDto(savedMenuItem);
    } catch (error) {
      this.logger.error(`Error in create method: ${error.message}`);
      return this.errorHandler.handleError(error, 'Failed to create menu item', [NotFoundException]);
    }
  }

  async update(id: string, updateItemDto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Create a clone of the existing item and apply updates
      let updatedItem = existingItem;
      
      // Update each property if it exists in the DTO
      if (updateItemDto.name !== undefined) {
        updatedItem = updatedItem.updateName(updateItemDto.name);
      }
      
      if (updateItemDto.description !== undefined) {
        updatedItem = updatedItem.updateDescription(updateItemDto.description);
      }
      
      if (updateItemDto.price !== undefined) {
        updatedItem = updatedItem.updatePrice(updateItemDto.price);
      }
      
      if (updateItemDto.discountedPrice !== undefined) {
        updatedItem = updatedItem.updateDiscountedPrice(updateItemDto.discountedPrice);
      }
      
      if (updateItemDto.available !== undefined) {
        updatedItem = updatedItem.updateAvailability(updateItemDto.available);
      }
      
      if (updateItemDto.featured !== undefined) {
        updatedItem = updatedItem.updateFeatured(updateItemDto.featured);
      }
      
      if (updateItemDto.ingredients !== undefined) {
        updatedItem = updatedItem.updateIngredients(updateItemDto.ingredients);
      }
      
      if (updateItemDto.options !== undefined) {
        // Convert DTOs to schema types
        const options = updateItemDto.options.map(option => ({
          name: option.name,
          description: option.description,
          required: option.required,
          multiple: option.multiple,
          minSelections: option.minSelections,
          maxSelections: option.maxSelections,
          displayOrder: option.displayOrder,
          values: option.values.map(value => ({
            name: value.name,
            price: value.price,
            available: value.available !== undefined ? value.available : true,
            description: value.description,
            externalId: value.externalId
          }))
        })) as OptionType[];
        
        updatedItem = updatedItem.updateOptions(options);
      }
      
      if (updateItemDto.tags !== undefined) {
        updatedItem = updatedItem.updateTags(updateItemDto.tags);
      }
      
      if (updateItemDto.dietary !== undefined) {
        updatedItem = updatedItem.updateDietary(updateItemDto.dietary);
      }
      
      if (updateItemDto.images !== undefined) {
        updatedItem = updatedItem.updateImages(updateItemDto.images);
      }

      // Save the updated item
      const savedItem = await this.menuItemDomainRepository.update(id, updatedItem);
      
      if (!savedItem) {
        throw new Error('Failed to update menu item');
      }
      
      return this.mapToDto(savedItem);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to update menu item', [NotFoundException]);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Remove the item from its category
      try {
        await this.categoryDomainRepository.removeItem(existingItem.categoryId, id);
      } catch (error) {
        this.logger.warn(`Error removing item from category: ${error.message}`);
        // Continue since we still want to delete the item
      }
      
      // Delete the item
      await this.menuItemDomainRepository.delete(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to delete menu item', [NotFoundException]);
    }
  }

  async updateAvailability(id: string, available: boolean): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Update availability
      const updatedItem = existingItem.updateAvailability(available);
      
      // Save the updated item
      const savedItem = await this.menuItemDomainRepository.update(id, updatedItem);
      
      if (!savedItem) {
        throw new Error('Failed to update menu item availability');
      }
      
      return this.mapToDto(savedItem);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to update menu item availability', [NotFoundException]);
    }
  }

  // New methods for managing options

  async getOptions(id: string): Promise<OptionTypeDto[]> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Return the options as DTOs
      return existingItem.options || [];
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to get menu item options', [NotFoundException]);
    }
  }

  async addOption(id: string, createOptionDto: CreateOptionTypeDto): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Convert DTO to schema type
      const option: OptionType = {
        name: createOptionDto.name,
        description: createOptionDto.description,
        required: createOptionDto.required,
        multiple: createOptionDto.multiple,
        minSelections: createOptionDto.minSelections,
        maxSelections: createOptionDto.maxSelections,
        displayOrder: createOptionDto.displayOrder,
        values: createOptionDto.values.map(value => ({
          name: value.name,
          price: value.price,
          available: value.available !== undefined ? value.available : true,
          description: value.description,
          externalId: value.externalId
        }))
      };
      
      // Add the new option
      const updatedItem = existingItem.addOption(option);
      
      // Save the updated item
      const savedItem = await this.menuItemDomainRepository.update(id, updatedItem);
      
      if (!savedItem) {
        throw new Error('Failed to add option to menu item');
      }
      
      return this.mapToDto(savedItem);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to add option to menu item', [NotFoundException]);
    }
  }

  async updateOption(id: string, optionIndex: number, updateOptionDto: UpdateOptionTypeDto): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Verify the option exists
      if (optionIndex < 0 || !existingItem.options || optionIndex >= existingItem.options.length) {
        throw new NotFoundException(`Option at index ${optionIndex} not found for menu item with ID ${id}`);
      }
      
      // Convert DTO to schema type
      const option: OptionType = {
        name: updateOptionDto.name,
        description: updateOptionDto.description,
        required: updateOptionDto.required,
        multiple: updateOptionDto.multiple,
        minSelections: updateOptionDto.minSelections,
        maxSelections: updateOptionDto.maxSelections,
        displayOrder: updateOptionDto.displayOrder,
        values: updateOptionDto.values.map(value => ({
          name: value.name,
          price: value.price,
          available: value.available !== undefined ? value.available : true,
          description: value.description,
          externalId: value.externalId
        }))
      };
      
      // Update the option
      const updatedItem = existingItem.updateOption(optionIndex, option);
      
      // Save the updated item
      const savedItem = await this.menuItemDomainRepository.update(id, updatedItem);
      
      if (!savedItem) {
        throw new Error('Failed to update menu item option');
      }
      
      return this.mapToDto(savedItem);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to update menu item option', [NotFoundException]);
    }
  }

  async removeOption(id: string, optionIndex: number): Promise<MenuItemResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Verify the item exists
      const existingItem = await this.menuItemDomainRepository.findById(id);
      if (!existingItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found`);
      }
      
      // Verify the option exists
      if (optionIndex < 0 || !existingItem.options || optionIndex >= existingItem.options.length) {
        throw new NotFoundException(`Option at index ${optionIndex} not found for menu item with ID ${id}`);
      }
      
      // Remove the option
      const updatedItem = existingItem.removeOption(optionIndex);
      
      // Save the updated item
      const savedItem = await this.menuItemDomainRepository.update(id, updatedItem);
      
      if (!savedItem) {
        throw new Error('Failed to remove option from menu item');
      }
      
      return this.mapToDto(savedItem);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to remove option from menu item', [NotFoundException]);
    }
  }

  // Helper methods

  private mapToDto(menuItem: MenuItem): MenuItemResponseDto {
    const dto = new MenuItemResponseDto();
    
    dto.id = menuItem.id;
    dto.categoryId = menuItem.categoryId;
    dto.name = menuItem.name;
    dto.description = menuItem.description;
    dto.images = menuItem.images;
    dto.price = menuItem.price;
    dto.discountedPrice = menuItem.discountedPrice;
    dto.currency = menuItem.currency;
    dto.preparationTime = menuItem.preparationTime;
    dto.calories = menuItem.calories;
    dto.spicyLevel = menuItem.spicyLevel;
    
    // Convert dietary object to DietaryInfoDto
    if (menuItem.dietary) {
      dto.dietary = {
        vegetarian: menuItem.dietary.vegetarian,
        vegan: menuItem.dietary.vegan,
        glutenFree: menuItem.dietary.glutenFree,
        nutFree: menuItem.dietary.nutFree,
        dairyFree: menuItem.dietary.dairyFree
      };
    }
    
    dto.ingredients = menuItem.ingredients;
    dto.options = menuItem.options;
    dto.available = menuItem.available;
    dto.featured = menuItem.featured;
    dto.tags = menuItem.tags;
    dto.metadata = menuItem.metadata;
    dto.createdAt = menuItem.createdAt;
    dto.updatedAt = menuItem.updatedAt;
    
    return dto;
  }
} 