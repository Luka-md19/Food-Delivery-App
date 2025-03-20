import { Menu } from '../../schemas';
import { CreateMenuDto, UpdateMenuDto } from '../../dto';

export interface IMenuRepository {
  /**
   * Find all menus with optional filtering
   * @param filter Optional filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   */
  findAll(filter?: any, page?: number, limit?: number): Promise<any[]>;
  
  /**
   * Count menus matching the filter
   * @param filter Optional filter criteria
   */
  count(filter?: any): Promise<number>;
  
  /**
   * Find a menu by ID
   * @param id Menu ID
   */
  findById(id: string): Promise<any | null>;
  
  /**
   * Find menus by restaurant ID
   * @param restaurantId Restaurant ID
   * @param activeOnly Whether to return only active menus
   */
  findByRestaurantId(restaurantId: string, activeOnly?: boolean): Promise<any[]>;
  
  /**
   * Create a new menu
   * @param createMenuDto Menu creation data
   */
  create(createMenuDto: CreateMenuDto): Promise<any>;
  
  /**
   * Update a menu
   * @param id Menu ID
   * @param updateMenuDto Menu update data
   */
  update(id: string, updateMenuDto: UpdateMenuDto): Promise<any | null>;
  
  /**
   * Delete a menu
   * @param id Menu ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Add a category to a menu
   * @param menuId Menu ID
   * @param categoryId Category ID
   */
  addCategory(menuId: string, categoryId: string): Promise<any | null>;
  
  /**
   * Remove a category from a menu
   * @param menuId Menu ID
   * @param categoryId Category ID
   */
  removeCategory(menuId: string, categoryId: string): Promise<any | null>;
  
  /**
   * Save a menu (create or update)
   * @param menu Menu to save
   */
  save(menu: any): Promise<any>;
  
  /**
   * Find a menu containing a specific menu item
   * @param itemId Menu item ID
   */
  findMenuByItemId(itemId: string): Promise<any | null>;
} 