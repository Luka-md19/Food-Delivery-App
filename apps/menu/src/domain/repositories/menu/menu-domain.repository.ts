import { Injectable, Inject } from '@nestjs/common';
import { IMenuRepository } from '../../../repositories/menu/menu.repository.interface';
import { IMenuDomainRepository } from './menu.repository.interface';
import { Menu } from '../../entities/menu.entity';
import { Availability } from '../../value-objects/availability.value-object';
import { ObjectId } from 'mongodb';
import { MenuNotFoundException, MenuDomainException } from '../../exceptions';

/**
 * Implementation of the domain repository interface
 * This adapts the existing infrastructure repository to work with domain entities
 */
@Injectable()
export class MenuDomainRepository implements IMenuDomainRepository {
  constructor(
    @Inject('IMenuRepository') private readonly menuRepository: IMenuRepository
  ) {}

  async findById(id: string): Promise<Menu | null> {
    const menuData = await this.menuRepository.findById(id);
    if (!menuData) {
      return null;
    }
    
    return Menu.fromPersistence(menuData);
  }

  async findByRestaurantId(restaurantId: string, activeOnly = false): Promise<Menu[]> {
    const menusData = await this.menuRepository.findByRestaurantId(restaurantId, activeOnly);
    return menusData.map(menuData => Menu.fromPersistence(menuData));
  }

  async findAll(filter: any = {}, page = 1, limit = 10): Promise<Menu[]> {
    const menusData = await this.menuRepository.findAll(filter, page, limit);
    return menusData.map(menuData => Menu.fromPersistence(menuData));
  }

  async count(filter: any = {}): Promise<number> {
    return this.menuRepository.count(filter);
  }

  async save(menu: Menu): Promise<Menu> {
    const menuData = menu.toPersistence();
    
    try {
      let savedMenuData;
      
      // If the menu has an ID, update it
      if (menuData._id) {
        const { _id, ...updateData } = menuData;
        savedMenuData = await this.menuRepository.update(_id, updateData);
        if (!savedMenuData) {
          throw new MenuNotFoundException(menuData._id);
        }
      } else {
        // For new menus, create it with the infrastructure repository
        // Exclude _id field to let MongoDB generate it
        const { _id, ...createData } = menuData;
        savedMenuData = await this.menuRepository.create(createData);
        if (!savedMenuData) {
          throw new MenuDomainException('Failed to create menu');
        }
      }
      
      // Ensure we have a valid response before creating the domain entity
      if (!savedMenuData._id) {
        throw new MenuDomainException('Menu was saved but no ID was returned');
      }
      
      return Menu.fromPersistence(savedMenuData);
    } catch (error) {
      if (error instanceof MenuNotFoundException || error instanceof MenuDomainException) {
        throw error;
      }
      throw new MenuDomainException(`Failed to save menu: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.menuRepository.delete(id);
    if (!deleted) {
      throw new MenuNotFoundException(id);
    }
    return deleted;
  }
} 