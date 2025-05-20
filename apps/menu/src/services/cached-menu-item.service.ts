import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { MenuItemService } from './menu-item.service';
import { CacheService } from '@app/common/redis/cache.service';
import { 
  MenuItemResponseDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateOptionTypeDto,
  UpdateOptionTypeDto,
  SearchMenuItemDto,
  OptionTypeDto
} from '../dto';
import { MenuItem as MenuItemSchema } from '../schemas';
import { Logger } from '@nestjs/common';
import { Request } from 'express';

/**
 * Cache-enabled wrapper for the MenuItemService
 * This implements the decorator pattern to add caching functionality
 */
@Injectable({ scope: Scope.REQUEST })
export class CachedMenuItemService {
  private readonly logger = new Logger(CachedMenuItemService.name);
  private bypassCache: boolean = false;

  // Cache TTLs in seconds
  private readonly MENU_ITEM_TTL = 3600; // 1 hour for single items
  private readonly MENU_ITEMS_TTL = 300; // 5 minutes for collections
  private readonly SEARCH_RESULTS_TTL = 60; // 1 minute for search results

  constructor(
    private readonly menuItemService: MenuItemService,
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
   * Get a menu item by ID with caching
   */
  async findById(id: string): Promise<MenuItemResponseDto> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu item ID: ${id}`);
      return this.menuItemService.findById(id);
    }
    
    const cacheKey = `menu:item:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu item ID: ${id}`);
        return this.menuItemService.findById(id);
      },
      this.MENU_ITEM_TTL
    );
  }

  /**
   * Get a paginated list of menu items with caching
   */
  async findAll(page = 1, limit = 10, filter: Partial<MenuItemSchema> = {}): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu items list, page: ${page}, limit: ${limit}`);
      return this.menuItemService.findAll(page, limit, filter);
    }
    
    // Create a unique cache key based on the parameters
    const filterKey = JSON.stringify(filter);
    const cacheKey = `menu:items:all:${page}:${limit}:${filterKey}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu items list, page: ${page}, limit: ${limit}`);
        return this.menuItemService.findAll(page, limit, filter);
      },
      this.MENU_ITEMS_TTL
    );
  }

  /**
   * Find menu items by category ID with caching
   */
  async findByCategoryId(categoryId: string, page = 1, limit = 10, filter: Partial<MenuItemSchema> = {}): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu items by category: ${categoryId}`);
      return this.menuItemService.findByCategoryId(categoryId, page, limit, filter);
    }
    
    const filterKey = JSON.stringify(filter);
    const cacheKey = `menu:items:category:${categoryId}:${page}:${limit}:${filterKey}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu items by category: ${categoryId}`);
        return this.menuItemService.findByCategoryId(categoryId, page, limit, filter);
      },
      this.MENU_ITEMS_TTL
    );
  }

  /**
   * Search menu items with caching
   */
  async search(searchParams: SearchMenuItemDto): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu items search`);
      return this.menuItemService.search(searchParams);
    }
    
    // Create a unique cache key based on the search parameters
    const searchKey = JSON.stringify(searchParams);
    const cacheKey = `menu:items:search:${searchKey}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu items search: ${searchKey}`);
        return this.menuItemService.search(searchParams);
      },
      this.SEARCH_RESULTS_TTL
    );
  }

  /**
   * Get menu item options with caching
   */
  async getOptions(id: string): Promise<OptionTypeDto[]> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for menu item options, ID: ${id}`);
      return this.menuItemService.getOptions(id);
    }
    
    const cacheKey = `menu:item:${id}:options`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for menu item options, ID: ${id}`);
        return this.menuItemService.getOptions(id);
      },
      this.MENU_ITEM_TTL
    );
  }

  /**
   * The following methods modify data, so they invalidate related caches
   */

  /**
   * Create a new menu item and invalidate relevant caches
   */
  async create(createItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    const result = await this.menuItemService.create(createItemDto);
    
    // Invalidate category cache since it has a new item
    await this.invalidateCategoryCache(createItemDto.categoryId);
    
    // Invalidate all items list cache - we could be more granular but this is safer
    await this.invalidateAllItemsCache();
    
    return result;
  }

  /**
   * Update a menu item and invalidate relevant caches
   */
  async update(id: string, updateItemDto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    // Get the original item to check if category changed
    const originalItem = await this.menuItemService.findById(id);
    const result = await this.menuItemService.update(id, updateItemDto);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // If category changed, invalidate both old and new category caches
    if (updateItemDto.categoryId && updateItemDto.categoryId !== originalItem.categoryId) {
      await this.invalidateCategoryCache(originalItem.categoryId);
      await this.invalidateCategoryCache(updateItemDto.categoryId);
    } else if (originalItem.categoryId) {
      // Otherwise just invalidate the current category cache
      await this.invalidateCategoryCache(originalItem.categoryId);
    }
    
    // Invalidate all items cache since counts and data have changed
    await this.invalidateAllItemsCache();
    
    // Invalidate search cache as item properties might affect search results
    await this.invalidateSearchCache();
    
    return result;
  }

  /**
   * Delete a menu item and invalidate relevant caches
   */
  async delete(id: string): Promise<void> {
    // Get the original item to know which category cache to invalidate
    const originalItem = await this.menuItemService.findById(id);
    await this.menuItemService.delete(id);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // Invalidate category cache
    if (originalItem.categoryId) {
      await this.invalidateCategoryCache(originalItem.categoryId);
    }
    
    // Invalidate all items cache
    await this.invalidateAllItemsCache();
    
    // Invalidate search cache
    await this.invalidateSearchCache();
  }

  /**
   * Update menu item availability and invalidate relevant caches
   */
  async updateAvailability(id: string, available: boolean): Promise<MenuItemResponseDto> {
    const result = await this.menuItemService.updateAvailability(id, available);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // Invalidate search cache as availability affects search results
    await this.invalidateSearchCache();
    
    return result;
  }

  /**
   * Add an option to a menu item and invalidate relevant caches
   */
  async addOption(id: string, createOptionDto: CreateOptionTypeDto): Promise<MenuItemResponseDto> {
    const result = await this.menuItemService.addOption(id, createOptionDto);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // Invalidate the options cache
    await this.invalidateOptionsCache(id);
    
    return result;
  }

  /**
   * Update an option and invalidate relevant caches
   */
  async updateOptionById(id: string, optionId: string, updateOptionDto: UpdateOptionTypeDto): Promise<MenuItemResponseDto> {
    const result = await this.menuItemService.updateOptionById(id, optionId, updateOptionDto);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // Invalidate the options cache
    await this.invalidateOptionsCache(id);
    
    return result;
  }

  /**
   * Remove an option and invalidate relevant caches
   */
  async removeOption(id: string, optionId: string): Promise<void> {
    await this.menuItemService.removeOptionById(id, optionId);
    
    // Invalidate the specific item cache
    await this.invalidateItemCache(id);
    
    // Invalidate the options cache
    await this.invalidateOptionsCache(id);
  }

  /**
   * Cache invalidation helpers
   */
  
  private async invalidateItemCache(id: string): Promise<void> {
    await this.cacheService.delete(`menu:item:${id}`);
    this.logger.debug(`Invalidated cache for menu item: ${id}`);
  }
  
  private async invalidateOptionsCache(id: string): Promise<void> {
    await this.cacheService.delete(`menu:item:${id}:options`);
    this.logger.debug(`Invalidated cache for menu item options: ${id}`);
  }
  
  private async invalidateCategoryCache(categoryId: string): Promise<void> {
    // Use a pattern to delete all pages of this category's items
    const keys = await this.cacheService.keys(`menu:items:category:${categoryId}:*`);
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated ${keys.length} cache entries for category: ${categoryId}`);
    }
  }
  
  private async invalidateAllItemsCache(): Promise<void> {
    // Use a pattern to delete all pages of all items
    const keys = await this.cacheService.keys('menu:items:all:*');
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated ${keys.length} cache entries for all menu items`);
    }
  }
  
  private async invalidateSearchCache(): Promise<void> {
    // Use a pattern to delete all search results
    const keys = await this.cacheService.keys('menu:items:search:*');
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated ${keys.length} cache entries for menu item searches`);
    }
  }
} 