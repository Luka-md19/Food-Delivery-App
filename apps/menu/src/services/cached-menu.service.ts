import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { MenuService } from './menu.service';
import { CacheService } from '@app/common/redis/cache.service';
import { 
  MenuResponseDto,
  CreateMenuDto,
  UpdateMenuDto,
} from '../dto';
import { Menu as MenuSchema } from '../schemas';
import { Logger } from '@nestjs/common';
import { Request } from 'express';

/**
 * Cache-enabled wrapper for the MenuService
 * This implements the decorator pattern to add caching functionality
 */
@Injectable({ scope: Scope.REQUEST })
export class CachedMenuService {
  private readonly logger = new Logger(CachedMenuService.name);
  private bypassCache: boolean = false;

  // Cache TTLs in seconds
  private readonly MENU_TTL = 3600; // 1 hour for single menus
  private readonly MENUS_TTL = 600; // 10 minutes for collections
  private readonly RESTAURANT_MENUS_TTL = 900; // 15 minutes for restaurant menus
  
  constructor(
    private readonly menuService: MenuService,
    private readonly cacheService: CacheService,
    @Inject(REQUEST) private readonly request: Request
  ) {
    // Check if cache bypass is requested
    this.bypassCache = !!(request as any).bypassCache;
    if (this.bypassCache) {
      this.logger.log('Cache bypass enabled for this request');
    }
  }

  /**
   * Get a menu by ID with caching
   */
  async findById(id: string): Promise<MenuResponseDto> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu ID: ${id}`);
      return this.menuService.findById(id);
    }
    
    const cacheKey = `menu:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu ID: ${id}`);
        return this.menuService.findById(id);
      },
      this.MENU_TTL
    );
  }

  /**
   * Get a paginated list of menus with caching
   */
  async findAll(page = 1, limit = 10, filter: Partial<MenuSchema> = {}): Promise<{
    items: MenuResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menus list, page: ${page}, limit: ${limit}`);
      return this.menuService.findAll(page, limit, filter);
    }
    
    // Create a unique cache key based on the parameters
    const filterKey = JSON.stringify(filter);
    const cacheKey = `menus:all:${page}:${limit}:${filterKey}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menus list, page: ${page}, limit: ${limit}`);
        return this.menuService.findAll(page, limit, filter);
      },
      this.MENUS_TTL
    );
  }

  /**
   * Get menus by restaurant ID with caching
   */
  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<MenuResponseDto[]> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for restaurant menus, restaurantId: ${restaurantId}`);
      return this.menuService.findByRestaurantId(restaurantId, activeOnly);
    }
    
    const cacheKey = `menus:restaurant:${restaurantId}:active:${activeOnly}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for restaurant menus, restaurantId: ${restaurantId}`);
        return this.menuService.findByRestaurantId(restaurantId, activeOnly);
      },
      this.RESTAURANT_MENUS_TTL
    );
  }

  /**
   * The following methods modify data, so they invalidate related caches
   */

  /**
   * Create a new menu and invalidate relevant caches
   */
  async create(createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
    const result = await this.menuService.create(createMenuDto);
    
    // If this menu belongs to a restaurant, invalidate that restaurant's menus cache
    if (createMenuDto.restaurantId) {
      await this.invalidateRestaurantMenusCache(createMenuDto.restaurantId);
    }
    
    // Invalidate all menus cache
    await this.invalidateAllMenusCache();
    
    return result;
  }

  /**
   * Update a menu and invalidate relevant caches
   */
  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<MenuResponseDto> {
    // Get the original menu to check if restaurant changed
    const originalMenu = await this.menuService.findById(id);
    const result = await this.menuService.update(id, updateMenuDto);
    
    // Invalidate the specific menu cache
    await this.invalidateMenuCache(id);
    
    // If the menu has a restaurant, invalidate that restaurant's menus cache
    if (originalMenu.restaurantId) {
      await this.invalidateRestaurantMenusCache(originalMenu.restaurantId);
    }
    
    // Invalidate all menus cache
    await this.invalidateAllMenusCache();
    
    return result;
  }

  /**
   * Delete a menu and invalidate relevant caches
   */
  async delete(id: string): Promise<void> {
    // Get the original menu to know which restaurant's cache to invalidate
    const originalMenu = await this.menuService.findById(id);
    await this.menuService.delete(id);
    
    // Invalidate the specific menu cache
    await this.invalidateMenuCache(id);
    
    // If the menu has a restaurant, invalidate that restaurant's menus cache
    if (originalMenu.restaurantId) {
      await this.invalidateRestaurantMenusCache(originalMenu.restaurantId);
    }
    
    // Invalidate all menus cache
    await this.invalidateAllMenusCache();
  }

  /**
   * Add a category to a menu and invalidate relevant caches
   */
  async addCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    const result = await this.menuService.addCategory(menuId, categoryId);
    
    // Invalidate the specific menu cache
    await this.invalidateMenuCache(menuId);
    
    // Get the menu to find its restaurant
    const menu = await this.menuService.findById(menuId);
    if (menu.restaurantId) {
      await this.invalidateRestaurantMenusCache(menu.restaurantId);
    }
    
    return result;
  }

  /**
   * Remove a category from a menu and invalidate relevant caches
   */
  async removeCategory(menuId: string, categoryId: string): Promise<MenuResponseDto> {
    const result = await this.menuService.removeCategory(menuId, categoryId);
    
    // Invalidate the specific menu cache
    await this.invalidateMenuCache(menuId);
    
    // Get the menu to find its restaurant
    const menu = await this.menuService.findById(menuId);
    if (menu.restaurantId) {
      await this.invalidateRestaurantMenusCache(menu.restaurantId);
    }
    
    return result;
  }

  /**
   * Cache invalidation helpers
   */
   
  private async invalidateMenuCache(id: string): Promise<void> {
    await this.cacheService.delete(`menu:${id}`);
    this.logger.debug(`Invalidated cache for menu: ${id}`);
  }
  
  private async invalidateRestaurantMenusCache(restaurantId: string): Promise<void> {
    // Delete both active and all menus for this restaurant
    await this.cacheService.delete(`menus:restaurant:${restaurantId}:active:true`);
    await this.cacheService.delete(`menus:restaurant:${restaurantId}:active:false`);
    this.logger.debug(`Invalidated restaurant menus cache for restaurant: ${restaurantId}`);
  }
  
  private async invalidateAllMenusCache(): Promise<void> {
    // Use a pattern to delete all pages of all menus
    const keys = await this.cacheService.keys('menus:all:*');
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated ${keys.length} cache entries for all menus`);
    }
  }
} 