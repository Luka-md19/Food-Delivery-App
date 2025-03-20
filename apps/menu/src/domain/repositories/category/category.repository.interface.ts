import { Category } from '../../entities/category.entity';

/**
 * Domain repository interface for Category aggregate
 * This defines the contract for persistence operations on the Category aggregate
 */
export interface ICategoryDomainRepository {
  /**
   * Find a category by ID
   * @param id Category ID
   * @returns Promise resolving to a Category entity or null if not found
   */
  findById(id: string): Promise<Category | null>;
  
  /**
   * Find categories by menu ID
   * @param menuId Menu ID
   * @param activeOnly Whether to return only active categories
   * @returns Promise resolving to an array of Category entities
   */
  findByMenuId(menuId: string, activeOnly?: boolean): Promise<Category[]>;
  
  /**
   * Find all categories with optional filtering and pagination
   * @param filter Optional filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Promise resolving to an array of Category entities
   */
  findAll(filter?: any, page?: number, limit?: number): Promise<Category[]>;
  
  /**
   * Count categories matching the filter
   * @param filter Optional filter criteria
   * @returns Promise resolving to the count
   */
  count(filter?: any): Promise<number>;
  
  /**
   * Save a category (create or update)
   * @param category Category entity to save
   * @returns Promise resolving to the saved Category entity
   */
  save(category: Category): Promise<Category>;
  
  /**
   * Delete a category
   * @param id Category ID
   * @returns Promise resolving to a boolean indicating success
   */
  delete(id: string): Promise<boolean>;
}