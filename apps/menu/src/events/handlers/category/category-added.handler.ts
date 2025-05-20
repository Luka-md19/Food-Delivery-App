import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { IEventPublisher } from '@app/common';
import { CategoryAddedEvent } from '../../../domain/events/category/category-added.event';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(CategoryAddedEvent)
export class CategoryAddedHandler extends BaseEventHandler implements IEventHandler<CategoryAddedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher
  ) {
    super(CategoryAddedHandler.name);
  }

  async handle(event: CategoryAddedEvent): Promise<void> {
    try {
      this.logger.log(`Category added to menu: ${event.menuId} - Category: ${event.categoryId}`);
      
      // Transform domain event to integration event
      const payload = {
        menuId: event.menuId,
        categoryId: event.categoryId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.category.added', payload);
    } catch (error) {
      this.handleError(error, `Error handling CategoryAddedEvent for menu ${event.menuId} and category ${event.categoryId}`);
    }
  }
} 
