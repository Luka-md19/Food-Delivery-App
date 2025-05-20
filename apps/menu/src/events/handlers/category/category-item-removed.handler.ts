import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CategoryItemRemovedEvent } from '../../../domain/events/category/category-item-removed.event';
import { IEventPublisher } from '@app/common';
import { ICategoryDomainRepository } from '../../../domain/repositories/category/category.repository.interface';
import { BaseEventHandler } from '../base.handler';
import { CategoryNotFoundException } from '../../../domain/exceptions';

@Injectable()
@EventsHandler(CategoryItemRemovedEvent)
export class CategoryItemRemovedHandler extends BaseEventHandler implements IEventHandler<CategoryItemRemovedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    @Inject('ICategoryDomainRepository')
    private readonly categoryRepository: ICategoryDomainRepository
  ) {
    super(CategoryItemRemovedHandler.name);
  }

  async handle(event: CategoryItemRemovedEvent): Promise<void> {
    try {
      this.logger.log(`Item ${event.itemId} removed from category ${event.categoryId}`);
      
      // Fetch the category to include in the event
      const category = await this.categoryRepository.findById(event.categoryId);
      
      if (!category) {
        throw new CategoryNotFoundException(event.categoryId);
      }
      
      // Transform domain event to integration event
      const payload = {
        categoryId: event.categoryId,
        categoryName: category.name,
        itemId: event.itemId,
        menuId: category.menuId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('category.item.removed', payload);
    } catch (error) {
      this.handleError(error, `Error handling CategoryItemRemovedEvent for category ${event.categoryId} and item ${event.itemId}`);
    }
  }
} 
