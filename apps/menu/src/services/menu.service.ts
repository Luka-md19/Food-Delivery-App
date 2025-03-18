import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateMenuDto, UpdateMenuDto, MenuResponseDto } from '../dto';
import { Menu as MenuSchema } from '../schemas';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MenuCreatedEvent } from '../domain/events/menu-created.event';
import { BaseService } from '@app/common';

@Injectable()
export class MenuService extends BaseService {
  constructor(
    @Inject('IMenuDomainRepository') private readonly menuDomainRepository: any,
    @Inject('ICategoryDomainRepository') private readonly categoryDomainRepository: any
  ) {
    super(MenuService.name);
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
      const pagination = this.validatePagination(page, limit);
      
      this.logger.log(`Finding menus with page=${pagination.page}, limit=${pagination.limit}, filter=${JSON.stringify(filter)}`);
      
      const [menus, total] = await Promise.all([
        this.menuDomainRepository.findAll(filter, pagination.page, pagination.limit),
        this.menuDomainRepository.count(filter)
      ]);
      
      const pages = Math.ceil(total / pagination.limit);
      
      return {
        items: menus.map(menu => this.mapMenuToDto(menu)),
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menus');
    }
  }

  /**
   * Get a menu by ID
   */
  async findById(id: string): Promise<MenuResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Finding menu by ID: ${id}`);
      
      const menu = await this.menuDomainRepository.findById(id);
      
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      return this.mapMenuToDto(menu);
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menu', [NotFoundException]);
    }
  }

  /**
   * Get menus by restaurant ID
   */
  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<MenuResponseDto[]> {
    try {
      this.validateObjectId(restaurantId);
      
      this.logger.log(`Finding menus for restaurant ID: ${restaurantId}, activeOnly=${activeOnly}`);
      
      const menus = await this.menuDomainRepository.findByRestaurantId(restaurantId, activeOnly);
      
      return menus.map(menu => this.mapMenuToDto(menu));
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve menus for restaurant');
    }
  }

  /**
   * Create a new menu
   */
  async create(createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
    try {
      this.validateObjectId(createMenuDto.restaurantId);
      
      this.logger.log(`Creating menu: ${JSON.stringify(createMenuDto)}`);
      
      // Create a new menu with properties from the DTO
      const newMenu = {
        restaurantId: createMenuDto.restaurantId,
        name: createMenuDto.name,
        description: createMenuDto.description,
        active: createMenuDto.active ?? true,
        availability: createMenuDto.availability,
        categories: [],
        metadata: createMenuDto.metadata
      };
      
      // Use save or create method based on what's available
      let savedMenu;
      if (typeof this.menuDomainRepository.save === 'function') {
        savedMenu = await this.menuDomainRepository.save(newMenu);
      } else if (typeof this.menuDomainRepository.create === 'function') {
        savedMenu = await this.menuDomainRepository.create(newMenu);
      } else {
        this.logger.error('No save or create method available on menuDomainRepository');
        throw new Error('Repository implementation error');
      }
      
      return this.mapMenuToDto(savedMenu);
    } catch (error) {
      return this.handleError(error, 'Failed to create menu');
    }
  }

  /**
   * Update a menu
   */
  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<MenuResponseDto> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Updating menu ${id}: ${JSON.stringify(updateMenuDto)}`);
      
      // Verify the menu exists
      const existingMenu = await this.menuDomainRepository.findById(id);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      // Update properties from the DTO
      const updatedMenu = {
        ...existingMenu,
        ...updateMenuDto
      };
      
      // Remove undefined properties
      Object.keys(updatedMenu).forEach(key => {
        if (updatedMenu[key] === undefined) {
          delete updatedMenu[key];
        }
      });
      
      // Use save or update method based on what's available
      let savedMenu;
      if (typeof this.menuDomainRepository.save === 'function') {
        savedMenu = await this.menuDomainRepository.save(updatedMenu);
      } else if (typeof this.menuDomainRepository.update === 'function') {
        savedMenu = await this.menuDomainRepository.update(id, updatedMenu);
      } else {
        this.logger.error('No save or update method available on menuDomainRepository');
        throw new Error('Repository implementation error');
      }
      
      return this.mapMenuToDto(savedMenu);
    } catch (error) {
      return this.handleError(error, 'Failed to update menu', [NotFoundException]);
    }
  }

  /**
   * Delete a menu
   */
  async delete(id: string): Promise<boolean> {
    try {
      this.validateObjectId(id);
      
      this.logger.log(`Deleting menu: ${id}`);
      
      // Verify the menu exists
      const existingMenu = await this.menuDomainRepository.findById(id);
      if (!existingMenu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      
      // Delete the menu
      return await this.menuDomainRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'Failed to delete menu', [NotFoundException]);
    }
  }

  /**
   * Add a category to a menu
   */
  async addCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    try {
      this.validateObjectId(menuId);
      this.validateObjectId(categoryId);
      
      this.logger.log(`Adding category ${categoryId} to menu ${menuId}`);
      
      // Verify the menu exists
      const menu = await this.menuDomainRepository.findById(menuId);
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${menuId} not found`);
      }
      
      // Verify the category exists
      const category = await this.categoryDomainRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      
      // Create a copy of the menu to modify
      const updatedMenu = { ...menu };
      
      // Add category to the menu
      if (!updatedMenu.categories) {
        updatedMenu.categories = [];
      }
      
      if (!updatedMenu.categories.includes(categoryId)) {
        updatedMenu.categories.push(categoryId);
      }
      
      // Use save or update method based on what's available
      let savedMenu;
      if (typeof this.menuDomainRepository.save === 'function') {
        savedMenu = await this.menuDomainRepository.save(updatedMenu);
      } else if (typeof this.menuDomainRepository.update === 'function') {
        savedMenu = await this.menuDomainRepository.update(menuId, updatedMenu);
      } else if (typeof this.menuDomainRepository.addCategory === 'function') {
        savedMenu = await this.menuDomainRepository.addCategory(menuId, categoryId);
      } else {
        this.logger.error('No appropriate method available on menuDomainRepository for adding categories');
        throw new Error('Repository implementation error');
      }
      
      return this.mapMenuToDto(savedMenu);
    } catch (error) {
      return this.handleError(error, 'Failed to add category to menu', [NotFoundException]);
    }
  }

  /**
   * Remove a category from a menu
   */
  async removeCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    try {
      this.validateObjectId(menuId);
      this.validateObjectId(categoryId);
      
      this.logger.log(`Removing category ${categoryId} from menu ${menuId}`);
      
      // Verify the menu exists
      const menu = await this.menuDomainRepository.findById(menuId);
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${menuId} not found`);
      }
      
      // Create a copy of the menu to modify
      const updatedMenu = { ...menu };
      
      // Remove category from the menu
      if (updatedMenu.categories && updatedMenu.categories.includes(categoryId)) {
        updatedMenu.categories = updatedMenu.categories.filter(id => id !== categoryId);
      }
      
      // Use save or update method based on what's available
      let savedMenu;
      if (typeof this.menuDomainRepository.save === 'function') {
        savedMenu = await this.menuDomainRepository.save(updatedMenu);
      } else if (typeof this.menuDomainRepository.update === 'function') {
        savedMenu = await this.menuDomainRepository.update(menuId, updatedMenu);
      } else if (typeof this.menuDomainRepository.removeCategory === 'function') {
        savedMenu = await this.menuDomainRepository.removeCategory(menuId, categoryId);
      } else {
        this.logger.error('No appropriate method available on menuDomainRepository for removing categories');
        throw new Error('Repository implementation error');
      }
      
      return this.mapMenuToDto(savedMenu);
    } catch (error) {
      return this.handleError(error, 'Failed to remove category from menu', [NotFoundException]);
    }
  }

  /**
   * Map menu entity to DTO
   */
  private mapMenuToDto(menu: any): MenuResponseDto {
    return {
      id: menu.id,
      restaurantId: menu.restaurantId,
      name: menu.name,
      description: menu.description,
      active: menu.availability?.active ?? menu.active,
      availability: menu.availability,
      categories: menu.categories || [],
      metadata: menu.metadata,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt
    };
  }
}

@EventsHandler(MenuCreatedEvent)
export class MenuCreatedHandler implements IEventHandler<MenuCreatedEvent> {
  handle(event: MenuCreatedEvent) {
    // Event handling logic here
    console.log(`Menu created: ${event.menu?.id || 'unknown'}`);
  }
}