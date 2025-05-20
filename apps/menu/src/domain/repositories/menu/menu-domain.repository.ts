import { Injectable, Inject } from '@nestjs/common';
import { IMenuRepository } from '../../../repositories/menu/menu.repository.interface';
import { IMenuDomainRepository } from './menu.repository.interface';
import { Menu } from '../../entities/menu.entity';
import { Availability } from '../../value-objects/availability.value-object';
import { ObjectId } from 'mongodb';
import { 
  MenuNotFoundException, 
  ResourceConflictException,
  ValidationException
} from '../../exceptions';
import { EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

/**
 * Implementation of the domain repository interface
 * This adapts the existing infrastructure repository to work with domain entities
 */
@Injectable()
export class MenuDomainRepository implements IMenuDomainRepository {
  private readonly logger = new Logger(MenuDomainRepository.name);

  constructor(
    @Inject('IMenuRepository') private readonly menuRepository: IMenuRepository,
    private readonly eventBus: EventBus
  ) {}

  async findById(id: string): Promise<Menu | null> {
    const menuData = await this.menuRepository.findById(id);
    if (!menuData) {
      return null;
    }
    
    return Menu.fromPersistence(menuData);
  }

  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<Menu[]> {
    const menusData = await this.menuRepository.findByRestaurantId(restaurantId, activeOnly);
    return menusData.map(menuData => Menu.fromPersistence(menuData));
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<Menu[]> {
    try {
      this.logger.debug(`Finding all menus with filter: ${JSON.stringify(filter)}, page: ${page}, limit: ${limit}`);
      
      // Process the filter to ensure proper handling of ObjectIds
      const processedFilter: any = {};
      
      // Handle special cases for filters
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] === undefined) {
            return; // Skip undefined values
          }
          
          // Special handling for _id field
          if (key === '_id' && typeof filter[key] === 'string') {
            try {
              // Try to convert to ObjectId
              processedFilter[key] = new ObjectId(filter[key]);
            } catch (error) {
              // If not valid ObjectId, use as is
              this.logger.debug(`Invalid ObjectId format for _id: ${filter[key]}, using as string`);
              processedFilter[key] = filter[key];
            }
          } else {
            processedFilter[key] = filter[key];
          }
        });
      }
      
      this.logger.debug(`Processed filter: ${JSON.stringify(processedFilter)}`);
      
      const menusData = await this.menuRepository.findAll(processedFilter, page, limit);
      this.logger.debug(`Found ${menusData.length} menus`);
      
      if (menusData.length === 0) {
        this.logger.debug('No menus found, checking for any menus without filter');
        // If no menus found with the filter, try with an empty filter to see if there are any menus at all
        const checkAnyMenus = await this.menuRepository.findAll({}, 1, 1);
        if (checkAnyMenus.length > 0) {
          this.logger.debug(`Found ${checkAnyMenus.length} menus with empty filter - data exists but filter may be too restrictive`);
        } else {
          this.logger.debug('No menus found at all in the database');
        }
      }
      
      // Convert to domain entities
      return menusData.map(menuData => Menu.fromPersistence(menuData));
    } catch (error) {
      this.logger.error(`Error finding all menus: ${error.message}`);
      return [];
    }
  }

  async count(filter: any = {}): Promise<number> {
    try {
      this.logger.debug(`Counting menus with filter: ${JSON.stringify(filter)}`);
      
      // Process the filter to ensure proper handling of ObjectIds - same as in findAll
      const processedFilter: any = {};
      
      // Handle special cases for filters
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] === undefined) {
            return; // Skip undefined values
          }
          
          // Special handling for _id field
          if (key === '_id' && typeof filter[key] === 'string') {
            try {
              // Try to convert to ObjectId
              processedFilter[key] = new ObjectId(filter[key]);
            } catch (error) {
              // If not valid ObjectId, use as is
              this.logger.debug(`Invalid ObjectId format for _id: ${filter[key]}, using as string`);
              processedFilter[key] = filter[key];
            }
          } else {
            processedFilter[key] = filter[key];
          }
        });
      }
      
      const count = await this.menuRepository.count(processedFilter);
      this.logger.debug(`Found ${count} menus matching the filter`);
      
      // If count is 0, check if there are any menus at all to verify DB connection
      if (count === 0) {
        const totalMenus = await this.menuRepository.count({});
        this.logger.debug(`Total menus in database (without filter): ${totalMenus}`);
      }
      
      return count;
    } catch (error) {
      this.logger.error(`Error counting menus: ${error.message}`);
      return 0; // Return 0 on error
    }
  }

  /**
   * Save a menu
   */
  async save(menu: Menu): Promise<Menu> {
    try {
      const menuData = menu.toPersistence();
      
      if (menuData.id) {
        // Update an existing menu
        const result = await this.menuRepository.update(menuData.id, menuData);
        // Publish any events that were recorded in the entity
        this.publishEvents(menu);
        return Menu.fromPersistence(result);
      } else {
        // Create a new menu
        const result = await this.menuRepository.create(menuData);
        const savedMenu = Menu.fromPersistence(result);
        // Publish any events that were recorded in the entity
        this.publishEvents(menu);
        return savedMenu;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a category to a menu
   * @param menuId Menu ID
   * @param categoryId Category ID
   * @returns Promise resolving to the updated Menu entity or null if failed
   */
  async addCategory(menuId: string, categoryId: string): Promise<Menu | null> {
    try {
      const result = await this.menuRepository.addCategory(menuId, categoryId);
      if (!result) {
        return null;
      }
      return Menu.fromPersistence(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a category from a menu
   * @param menuId Menu ID
   * @param categoryId Category ID
   * @returns Promise resolving to the updated Menu entity or null if failed
   */
  async removeCategory(menuId: string, categoryId: string): Promise<Menu | null> {
    try {
      // Find the menu
      const menu = await this.findById(menuId);
      if (!menu) {
        return null;
      }
      
      // Remove the category using the domain entity method
      menu.removeCategory(categoryId);
      
      // Save the updated menu
      return this.save(menu);
    } catch (error) {
      this.logger.error(`Error removing category from menu: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Attempting to delete menu with ID: ${id}`);
      
      // First find the menu to ensure it exists and to call the domain method
      const menu = await this.findById(id);
      if (!menu) {
        throw new MenuNotFoundException(id);
      }
      
      // Call the domain method to emit events
      menu.delete();
      
      // Publish the delete event
      this.publishEvents(menu);
      
      // Now perform the actual deletion
      const deleted = await this.menuRepository.delete(id);
      if (!deleted) {
        throw new ResourceConflictException('menu', id, 'Failed to delete menu');
      }
      
      this.logger.debug(`Successfully deleted menu with ID: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting menu: ${error.message}`);
      if (error instanceof MenuNotFoundException || error instanceof ResourceConflictException) {
        throw error;
      }
      throw new ResourceConflictException('menu', id, `Failed to delete menu: ${error.message}`);
    }
  }

  /**
   * Publish all uncommitted events from the domain entity
   */
  private publishEvents(entity: Menu): void {
    // Get all uncommitted events from the entity
    const uncommittedEvents = entity.getUncommittedEvents();
    
    // Publish each event to the event bus
    uncommittedEvents.forEach(event => {
      this.eventBus.publish(event);
    });
    
    // Clear uncommitted events to prevent republishing
    entity.commit();
  }
  
  /**
   * Find menus containing a specific category
   * @param categoryId Category ID
   * @returns Promise resolving to an array of Menu entities
   */
  async findMenuByCategoryId(categoryId: string): Promise<Menu[]> {
    try {
      const menusData = await this.menuRepository.findMenuByCategoryId(categoryId);
      if (!menusData || !Array.isArray(menusData)) {
        return [];
      }
      return menusData.map(menuData => Menu.fromPersistence(menuData));
    } catch (error) {
      console.error(`Error finding menus by category ID: ${error.message}`);
      return [];
    }
  }
} 