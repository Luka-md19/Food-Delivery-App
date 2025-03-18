import { MenuItem } from '../entities/menu-item.entity';

export interface IMenuItemDomainRepository {
  findById(id: string): Promise<MenuItem | null>;
  save(menuItem: MenuItem): Promise<void>;
  delete(id: string): Promise<void>;
} 