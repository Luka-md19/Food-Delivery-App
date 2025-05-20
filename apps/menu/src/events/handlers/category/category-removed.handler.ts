import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CategoryRemovedEvent } from '../../../domain/events/category/category-removed.event';
import { IEventPublisher } from '@app/common';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(CategoryRemovedEvent)
export class CategoryRemovedHandler extends BaseEventHandler implements IEventHandler<CategoryRemovedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher
  ) {
    super(CategoryRemovedHandler.name);
  }

  async handle(event: CategoryRemovedEvent): Promise<void> {
    try {
      this.logger.log(`Category removed from menu: ${event.menuId} - Category: ${event.categoryId}`);
      
      // Transform domain event to integration event
      const payload = {
        menuId: event.menuId,
        categoryId: event.categoryId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.category.removed', payload);
    } catch (error) {
      this.handleError(error, `Error handling CategoryRemovedEvent for menu ${event.menuId} and category ${event.categoryId}`);
    }
  }
} 
