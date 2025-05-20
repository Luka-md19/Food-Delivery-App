// libs/common/src/redis/cache-example.service.ts
import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Example service demonstrating how to use the CacheService
 * This follows the Single Responsibility Principle by handling only example caching logic
 */
@Injectable()
export class CacheExampleService {
  // Default TTL for cached data (5 minutes)
  private readonly DEFAULT_TTL = 300;
  
  constructor(private readonly cacheService: CacheService) {}
  
  /**
   * Example of caching an expensive operation result
   * @param id Resource identifier
   * @returns Cached or freshly retrieved data
   */
  async getResourceById(id: string): Promise<any> {
    const cacheKey = `resource:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // This would be your expensive operation, like a database query or external API call
        const result = await this.simulateExpensiveOperation(id);
        return result;
      },
      this.DEFAULT_TTL
    );
  }
  
  /**
   * Example of caching data with a custom TTL
   * @param userId User identifier
   * @param ttl Custom time-to-live in seconds
   * @returns User data
   */
  async getUserProfile(userId: string, ttl = this.DEFAULT_TTL): Promise<any> {
    const cacheKey = `user:profile:${userId}`;
    const cachedData = await this.cacheService.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Simulate fetching user data from database
    const userData = await this.simulateUserDataFetch(userId);
    
    // Cache the result with the specified TTL
    await this.cacheService.set(cacheKey, userData, ttl);
    
    return userData;
  }
  
  /**
   * Example of manually invalidating cache
   * @param userId User identifier
   */
  async updateUserProfile(userId: string, updatedData: any): Promise<void> {
    // Update user data in database
    await this.simulateUserDataUpdate(userId, updatedData);
    
    // Invalidate the cache for this user
    await this.cacheService.delete(`user:profile:${userId}`);
  }
  
  /**
   * Example of checking if data exists in cache
   * @param key Cache key
   * @returns Whether data exists and its TTL
   */
  async checkCacheStatus(key: string): Promise<{ exists: boolean; ttl: number }> {
    const exists = await this.cacheService.exists(key);
    const ttl = exists ? await this.cacheService.ttl(key) : -1;
    
    return { exists, ttl };
  }
  
  // Simulated operations (would be actual database or API calls in a real service)
  
  private async simulateExpensiveOperation(id: string): Promise<any> {
    // Simulate delay of database query
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id,
      name: `Resource ${id}`,
      description: 'This is an expensive operation result',
      timestamp: new Date().toISOString()
    };
  }
  
  private async simulateUserDataFetch(userId: string): Promise<any> {
    // Simulate delay of database query
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id: userId,
      name: `User ${userId}`,
      email: `user-${userId}@example.com`,
      lastActive: new Date().toISOString()
    };
  }
  
  private async simulateUserDataUpdate(userId: string, data: any): Promise<void> {
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 100));
    // In a real application, this would update the database
  }
} 