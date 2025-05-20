import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CategoryItemAddedEvent } from '../../../domain/events/category/category-item-added.event';
import { IEventPublisher } from '@app/common';
import { ICategoryDomainRepository } from '../../../domain/repositories/category/category.repository.interface';
import { IMenuItemDomainRepository } from '../../../domain/repositories/menu-item/menu-item.repository.interface';
import { BaseEventHandler } from '../base.handler';
import { CategoryNotFoundException, MenuItemNotFoundException } from '../../../domain/exceptions';

@Injectable()
@EventsHandler(CategoryItemAddedEvent)
export class CategoryItemAddedHandler extends BaseEventHandler implements IEventHandler<CategoryItemAddedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    @Inject('ICategoryDomainRepository')
    private readonly categoryRepository: ICategoryDomainRepository,
    @Inject('IMenuItemDomainRepository')
    private readonly menuItemRepository: IMenuItemDomainRepository
  ) {
    super(CategoryItemAddedHandler.name);
  }

  async handle(event: CategoryItemAddedEvent): Promise<void> {
    try {
      this.logger.log(`Item ${event.itemId} added to category ${event.categoryId}`);
      
      // Fetch the category and menu item to include in the event
      const [category, menuItem] = await Promise.all([
        this.categoryRepository.findById(event.categoryId),
        this.menuItemRepository.findById(event.itemId)
      ]);
      
      if (!category) {
        throw new CategoryNotFoundException(event.categoryId);
      }
      
      if (!menuItem) {
        throw new MenuItemNotFoundException(event.itemId);
      }
      
      // Transform domain event to integration event
      const payload = {
        categoryId: event.categoryId,
        categoryName: category.name,
        itemId: event.itemId,
        itemName: menuItem.name,
        menuId: category.menuId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('category.item.added', payload);
    } catch (error) {
      this.handleError(error, `Error handling CategoryItemAddedEvent for category ${event.categoryId} and item ${event.itemId}`);
    }
  }
} 
