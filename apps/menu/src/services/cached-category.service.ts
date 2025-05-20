import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CategoryService } from './category.service';
import { CacheService } from '@app/common/redis/cache.service';
import { 
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto
} from '../dto';
import { Category as CategorySchema } from '../schemas';
import { Logger } from '@nestjs/common';
import { Request } from 'express';

/**
 * Cache-enabled wrapper for the CategoryService
 * This implements the decorator pattern to add caching functionality
 */
@Injectable({ scope: Scope.REQUEST })
export class CachedCategoryService {
  private readonly logger = new Logger(CachedCategoryService.name);
  private bypassCache: boolean = false;

  // Cache TTLs in seconds
  private readonly CATEGORY_TTL = 3600; // 1 hour for single categories
  private readonly CATEGORIES_TTL = 600; // 10 minutes for collections
  
  constructor(
    private readonly categoryService: CategoryService,
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
   * Get a category by ID with caching
   */
  async findById(id: string): Promise<CategoryResponseDto> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for category ID: ${id}`);
      return this.categoryService.findById(id);
    }
    
    const cacheKey = `category:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for category ID: ${id}`);
        return this.categoryService.findById(id);
      },
      this.CATEGORY_TTL
    );
  }

  /**
   * Get a paginated list of categories with caching
   */
  async findAll(page = 1, limit = 10, filter: Partial<CategorySchema> = {}): Promise<{
    items: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If bypass flag is set, skip cache
    if (this.bypassCache) {
      this.logger.debug(`Bypassing cache for categories list, page: ${page}, limit: ${limit}`);
      return this.categoryService.findAll(page, limit, filter);
    }
    
    // Create a unique cache key based on the parameters
    const filterKey = JSON.stringify(filter);
    const cacheKey = `categories:all:${page}:${limit}:${filterKey}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`Cache miss for categories list, page: ${page}, limit: ${limit}`);
        return this.categoryService.findAll(page, limit, filter);
      },
      this.CATEGORIES_TTL
    );
  }

  /**
   * The following methods modify data, so they invalidate related caches
   */

  /**
   * Create a new category and invalidate relevant caches
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const result = await this.categoryService.create(createCategoryDto);
    
    // Invalidate all categories cache
    await this.invalidateAllCategoriesCache();
    
    return result;
  }

  /**
   * Update a category and invalidate relevant caches
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const result = await this.categoryService.update(id, updateCategoryDto);
    
    // Invalidate the specific category cache
    await this.invalidateCategoryCache(id);
    
    // Invalidate all categories cache
    await this.invalidateAllCategoriesCache();
    
    return result;
  }

  /**
   * Delete a category and invalidate relevant caches
   */
  async delete(id: string): Promise<void> {
    await this.categoryService.delete(id);
    
    // Invalidate the specific category cache
    await this.invalidateCategoryCache(id);
    
    // Invalidate all categories cache
    await this.invalidateAllCategoriesCache();
  }

  /**
   * Add an item to a category and invalidate relevant caches
   */
  async addItem(categoryId: string, itemId: string): Promise<CategoryResponseDto> {
    const result = await this.categoryService.addItem(categoryId, itemId);
    
    // Invalidate the specific category cache
    await this.invalidateCategoryCache(categoryId);
    
    return result;
  }

  /**
   * Remove an item from a category and invalidate relevant caches
   */
  async removeItem(categoryId: string, itemId: string): Promise<void> {
    await this.categoryService.removeItem(categoryId, itemId);
    
    // Invalidate the specific category cache
    await this.invalidateCategoryCache(categoryId);
  }

  /**
   * Cache invalidation helpers
   */
   
  private async invalidateCategoryCache(id: string): Promise<void> {
    await this.cacheService.delete(`category:${id}`);
    this.logger.debug(`Invalidated cache for category: ${id}`);
  }
  
  private async invalidateAllCategoriesCache(): Promise<void> {
    // Use a pattern to delete all pages of categories
    const keys = await this.cacheService.keys('categories:all:*');
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated ${keys.length} cache entries for all categories`);
    }
  }
} 