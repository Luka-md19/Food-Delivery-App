import { MenuItem } from '../../entities/menu-item.entity';

export interface IMenuItemDomainRepository {
  findById(id: string): Promise<MenuItem | null>;
  findAll(filter?: any, page?: number, limit?: number): Promise<MenuItem[]>;
  findByCategoryId(categoryId: string, filter?: any, page?: number, limit?: number): Promise<MenuItem[]>;
  count(filter?: any): Promise<number>;
  countByCategoryId(categoryId: string, filter?: any): Promise<number>;
  save(menuItem: MenuItem): Promise<MenuItem>;
  delete(id: string): Promise<void>;
  
  /**
   * Search menu items with text search and advanced filtering
   * @param searchParams Search parameters including query text and filters
   * @returns Promise resolving to an array of MenuItem entities
   */
  search(searchParams: {
    query?: string;
    categoryId?: string;
    tags?: string[];
    dietary?: string[];
    priceRange?: { min?: number; max?: number };
    available?: boolean;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<MenuItem[]>;
  
  /**
   * Count results for a search query
   * @param searchParams Search parameters
   * @returns Promise resolving to the count
   */
  countSearch(searchParams: {
    query?: string;
    categoryId?: string;
    tags?: string[];
    dietary?: string[];
    priceRange?: { min?: number; max?: number };
    available?: boolean;
    featured?: boolean;
  }): Promise<number>;
} 