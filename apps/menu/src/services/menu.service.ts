import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateMenuDto, UpdateMenuDto, MenuResponseDto } from '../dto';
import { Menu as MenuSchema } from '../schemas';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';
import { Availability } from '../domain/value-objects/availability.value-object';
import { Menu } from '../domain/entities/menu.entity';

@Injectable()
export class MenuService {
  constructor(
    @Inject('IMenuDomainRepository') private readonly menuDomainRepository: any,
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService
  ) {
    // Initialize ErrorHandlerService with the service name
    this.errorHandler = new ErrorHandlerService(MenuService.name);
  }
  
  /**
   * Get all menus with pagination
   */
  async findAll(page = 1, limit = 10, filter: Partial<MenuSchema> = {}): Promise<{
    items: MenuResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const pagination = this.validator.validatePagination(page, limit);
      
      const [menus, totalCount] = await Promise.all([
        this.menuDomainRepository.findAll(filter, pagination.page, pagination.limit),
        this.menuDomainRepository.count(filter)
      ]);
      
      const pages = Math.ceil(totalCount / pagination.limit) || 1;
      
      return {
        items: menus.map(menu => this.mapToDto(menu)),
        total: totalCount,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menus');
    }
  }

  /**
   * Get a menu by ID
   */
  async findById(id: string): Promise<MenuResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      const menu = await this.menuDomainRepository.findById(id);
      
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      return this.mapToDto(menu);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menu', [NotFoundException]);
    }
  }

  /**
   * Get menus by restaurant ID
   */
  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<MenuResponseDto[]> {
    try {
      try {
        this.validator.validateObjectId(restaurantId);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      const menus = await this.menuDomainRepository.findByRestaurantId(restaurantId, activeOnly);
      return menus.map(menu => this.mapToDto(menu));
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to retrieve menus for restaurant');
    }
  }

  /**
   * Create a new menu
   */
  async create(createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
    try {
      // Validate input
      if (createMenuDto.restaurantId) {
        try {
          this.validator.validateObjectId(createMenuDto.restaurantId);
        } catch (error) {
          // Continue even with invalid ID format
        }
      }
      
      // Create a new Menu entity
      const menuEntity = Menu.create({
        name: createMenuDto.name,
        restaurantId: createMenuDto.restaurantId,
        description: createMenuDto.description,
        active: createMenuDto.active,
        availability: createMenuDto.availability ? 
          new Availability(
            createMenuDto.availability.daysOfWeek,
            createMenuDto.availability.startTime,
            createMenuDto.availability.endTime
          ) : undefined,
        categories: [],
        metadata: createMenuDto.metadata
      });
      
      // Save the menu entity using the domain repository
      const menu = await this.menuDomainRepository.save(menuEntity);
      
      // Map the domain entity to a DTO for the response
      const menuDto = this.mapToDto(menu);
      
      // Return the DTO
      return menuDto;
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to create menu');
    }
  }

  /**
   * Update a menu
   */
  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<MenuResponseDto> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Validate the menu exists
      const existingMenu = await this.menuDomainRepository.findById(id);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      // Update the menu entity properties
      if (updateMenuDto.name) existingMenu.updateName(updateMenuDto.name);
      if (updateMenuDto.description !== undefined) existingMenu.updateDescription(updateMenuDto.description);
      if (updateMenuDto.active !== undefined) existingMenu.updateActiveStatus(updateMenuDto.active);
      if (updateMenuDto.availability) {
        const availability = new Availability(
          updateMenuDto.availability.daysOfWeek,
          updateMenuDto.availability.startTime,
          updateMenuDto.availability.endTime
        );
        existingMenu.updateAvailability(availability);
      }
      if (updateMenuDto.metadata) existingMenu.updateMetadata(updateMenuDto.metadata);
      
      // Save the updated menu
      const updatedMenu = await this.menuDomainRepository.save(existingMenu);
      
      // Map the updated menu to a DTO for the response
      return this.mapToDto(updatedMenu);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to update menu', [NotFoundException]);
    }
  }

  /**
   * Delete a menu
   */
  async delete(id: string): Promise<void> {
    try {
      try {
        this.validator.validateObjectId(id);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Validate the menu exists
      const existingMenu = await this.menuDomainRepository.findById(id);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      // Delete the menu
      await this.menuDomainRepository.delete(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to delete menu', [NotFoundException]);
      throw error;
    }
  }

  /**
   * Add a category to a menu
   */
  async addCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    try {
      try {
        this.validator.validateObjectId(menuId);
        this.validator.validateObjectId(categoryId);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Validate the menu exists
      const existingMenu = await this.menuDomainRepository.findById(menuId);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${menuId} not found`);
      }
      
      // Validate the category exists
      const existingCategory = await this.categoryDomainRepository.findById(categoryId);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      // Add the category to the menu
      const updatedMenu = await this.menuDomainRepository.addCategory(menuId, categoryId);
      
      // Map the updated menu to a DTO for the response
      return this.mapToDto(updatedMenu);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to add category to menu', [NotFoundException]);
    }
  }

  /**
   * Remove a category from a menu
   */
  async removeCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    try {
      try {
        this.validator.validateObjectId(menuId);
        this.validator.validateObjectId(categoryId);
      } catch (error) {
        // Continue even with invalid ID format
      }
      
      // Validate the menu exists
      const existingMenu = await this.menuDomainRepository.findById(menuId);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${menuId} not found`);
      }
      
      // Validate the category exists
      const existingCategory = await this.categoryDomainRepository.findById(categoryId);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      // Remove the category using the domain repository's method
      const updatedMenu = await this.menuDomainRepository.removeCategory(menuId, categoryId);
      if (!updatedMenu) {
        throw new NotFoundException(`Failed to remove category ${categoryId} from menu ${menuId}`);
      }
      
      // Map the updated menu to a DTO for the response
      return this.mapToDto(updatedMenu);
    } catch (error) {
      return this.errorHandler.handleError(error, 'Failed to remove category from menu', [NotFoundException]);
    }
  }

  /**
   * Map menu entity to DTO
   */
  private mapToDto(menu: any): MenuResponseDto {
    return {
      id: menu.id,
      restaurantId: menu.restaurantId,
      name: menu.name,
      description: menu.description,
      active: menu.active,
      availability: menu.availability,
      categories: menu.categories,
      metadata: menu.metadata,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt
    };
  }
}