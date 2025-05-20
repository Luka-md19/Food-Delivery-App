import { CreateCategoryDto, UpdateCategoryDto } from '../../dto';

export interface ICategoryRepository {
  /**
   * Find all categories with optional filtering
   * @param filter Optional filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   */
  findAll(filter?: any, page?: number, limit?: number): Promise<any[]>;
  
  /**
   * Count categories matching the filter
   * @param filter Optional filter criteria
   */
  count(filter?: any): Promise<number>;
  
  /**
   * Find a category by ID
   * @param id Category ID
   */
  findById(id: string): Promise<any | null>;
  
  /**
   * Find categories by menu ID
   * @param menuId Menu ID
   * @param activeOnly Whether to return only active categories
   */
  findByMenuId(menuId: string, activeOnly?: boolean): Promise<any[]>;
  
  /**
   * Create a new category
   * @param categoryData Category creation data
   */
  create(categoryData: CreateCategoryDto): Promise<any>;
  
  /**
   * Update a category
   * @param id Category ID
   * @param updateData Category update data
   */
  update(id: string, updateData: UpdateCategoryDto): Promise<any | null>;
  
  /**
   * Delete a category
   * @param id Category ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Save a category (create or update)
   * @param category Category to save
   */
  save(category: any): Promise<any>;
  
  /**
   * Add an item to a category
   * @param categoryId Category ID
   * @param itemId Item ID
   */
  addItem(categoryId: string, itemId: string): Promise<any | null>;
  
  /**
   * Remove an item from a category
   * @param categoryId Category ID
   * @param itemId Item ID
   */
  removeItem(categoryId: string, itemId: string): Promise<any | null>;

  /**
   * Get direct access to the MongoDB category collection
   * @returns Promise resolving to the MongoDB collection
   */
  getCategoryCollection(): Promise<any>;
} 