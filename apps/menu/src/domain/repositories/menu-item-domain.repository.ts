import { Inject, Injectable } from '@nestjs/common';
import { IMenuItemDomainRepository } from './menu-item.repository.interface';
import { MenuItem } from '../entities/menu-item.entity';
import { IMenuRepository } from '../../repositories/menu.repository.interface';
import { MenuItemNotFoundException, CategoryNotFoundException } from '../exceptions';

@Injectable()
export class MenuItemDomainRepository implements IMenuItemDomainRepository {
  constructor(
    @Inject('IMenuRepository') private readonly menuRepository: IMenuRepository,
  ) {}

  async findById(id: string): Promise<MenuItem | null> {
    const menus = await this.menuRepository.findAll();
    
    for (const menu of menus) {
      for (const category of menu.categories) {
        const menuItem = category.items.find(item => item.id === id);
        if (menuItem) {
          return new MenuItem({
            id: menuItem.id,
            categoryId: category.id,
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            discountedPrice: menuItem.discountedPrice,
            available: menuItem.available,
            dietary: menuItem.dietary,
          });
        }
      }
    }
    
    return null;
  }

  async save(menuItem: MenuItem): Promise<void> {
    const menu = await this.menuRepository.findMenuByItemId(menuItem.id);
    
    if (!menu) {
      throw new MenuItemNotFoundException(menuItem.id);
    }
    
    const categoryIndex = menu.categories.findIndex(c => c.id === menuItem.categoryId);
    
    if (categoryIndex === -1) {
      throw new CategoryNotFoundException(menuItem.categoryId);
    }
    
    const itemIndex = menu.categories[categoryIndex].items.findIndex(i => i.id === menuItem.id);
    
    if (itemIndex === -1) {
      throw new MenuItemNotFoundException(menuItem.id, menuItem.categoryId);
    }
    
    // Update the item
    menu.categories[categoryIndex].items[itemIndex] = {
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      discountedPrice: menuItem.discountedPrice,
      available: menuItem.available,
      dietary: menuItem.dietary,
    };
    
    await this.menuRepository.save(menu);
  }

  async delete(id: string): Promise<void> {
    const menu = await this.menuRepository.findMenuByItemId(id);
    
    if (!menu) {
      throw new MenuItemNotFoundException(id);
    }
    
    let found = false;
    
    for (let i = 0; i < menu.categories.length; i++) {
      const itemIndex = menu.categories[i].items.findIndex(item => item.id === id);
      
      if (itemIndex !== -1) {
        menu.categories[i].items.splice(itemIndex, 1);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new MenuItemNotFoundException(id);
    }
    
    await this.menuRepository.save(menu);
  }
} 