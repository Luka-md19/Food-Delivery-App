import { Injectable, Inject } from '@nestjs/common';
import { ICategoryRepository } from '../../../repositories/category/category.repository.interface';
import { ICategoryDomainRepository } from './category.repository.interface';
import { Category } from '../../entities/category.entity';
import { ObjectId } from 'mongodb';
import { CategoryNotFoundException, MenuDomainException } from '../../exceptions';

/**
 * Implementation of the domain repository interface for categories
 * This adapts the existing infrastructure repository to work with domain entities
 */
@Injectable()
export class CategoryDomainRepository implements ICategoryDomainRepository {
  constructor(
    @Inject('ICategoryRepository') private readonly categoryRepository: ICategoryRepository
  ) {}

  async findById(id: string): Promise<Category | null> {
    const categoryData = await this.categoryRepository.findById(id);
    if (!categoryData) {
      return null;
    }
    
    return Category.fromPersistence(categoryData);
  }

  async findByMenuId(menuId: string, activeOnly = false): Promise<Category[]> {
    const categoriesData = await this.categoryRepository.findByMenuId(menuId, activeOnly);
    return categoriesData.map(categoryData => Category.fromPersistence(categoryData));
  }

  async findAll(filter?: any, page = 1, limit = 10): Promise<Category[]> {
    const categoriesData = await this.categoryRepository.findAll(filter, page, limit);
    return categoriesData.map(categoryData => Category.fromPersistence(categoryData));
  }

  async count(filter?: any): Promise<number> {
    return this.categoryRepository.count(filter);
  }

  async save(category: Category): Promise<Category> {
    const categoryData = category.toPersistence();
    
    // If the category has an ID, update it; otherwise, create it
    if (categoryData._id) {
      const { _id, ...updateData } = categoryData;
      const updatedCategoryData = await this.categoryRepository.update(_id, updateData);
      if (!updatedCategoryData) {
        throw new CategoryNotFoundException(_id);
      }
      return Category.fromPersistence(updatedCategoryData);
    } else {
      // For new categories, we need to create a new ID
      const newId = new ObjectId().toString();
      const newCategory = Category.create({
        id: newId,
        menuId: categoryData.menuId,
        name: categoryData.name,
        description: categoryData.description,
        image: categoryData.image,
        displayOrder: categoryData.displayOrder,
        active: categoryData.active,
        parentCategoryId: categoryData.parentCategoryId,
        metadata: categoryData.metadata
      });
      
      const createdCategoryData = await this.categoryRepository.create(newCategory.toPersistence());
      if (!createdCategoryData) {
        throw new MenuDomainException('Failed to create category');
      }
      return Category.fromPersistence(createdCategoryData);
    }
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.categoryRepository.delete(id);
    if (!deleted) {
      throw new CategoryNotFoundException(id);
    }
    return deleted;
  }
} 