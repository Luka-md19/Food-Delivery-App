import { Menu } from '../entities/menu.entity';

/**
 * Domain repository interface for Menu aggregate
 * This defines the contract for persistence operations on the Menu aggregate
 */
export interface IMenuDomainRepository {
  /**
   * Find a menu by ID
   * @param id Menu ID
   * @returns Promise resolving to a Menu entity or null if not found
   */
  findById(id: string): Promise<Menu | null>;
  
  /**
   * Find menus by restaurant ID
   * @param restaurantId Restaurant ID
   * @param activeOnly Whether to return only active menus
   * @returns Promise resolving to an array of Menu entities
   */
  findByRestaurantId(restaurantId: string, activeOnly?: boolean): Promise<Menu[]>;
  
  /**
   * Find all menus with optional filtering and pagination
   * @param filter Optional filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Promise resolving to an array of Menu entities
   */
  findAll(filter?: any, page?: number, limit?: number): Promise<Menu[]>;
  
  /**
   * Count menus matching the filter
   * @param filter Optional filter criteria
   * @returns Promise resolving to the count
   */
  count(filter?: any): Promise<number>;
  
  /**
   * Save a menu (create or update)
   * @param menu Menu entity to save
   * @returns Promise resolving to the saved Menu entity
   */
  save(menu: Menu): Promise<Menu>;
  
  /**
   * Delete a menu
   * @param id Menu ID
   * @returns Promise resolving to a boolean indicating success
   */
  delete(id: string): Promise<boolean>;
} 