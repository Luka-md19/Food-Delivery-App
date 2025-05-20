import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CategoryCreatedEvent } from '../../../domain/events/category/category-created.event';
import { IEventPublisher } from '@app/common';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedHandler extends BaseEventHandler implements IEventHandler<CategoryCreatedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
  ) {
    super(CategoryCreatedHandler.name);
  }

  async handle(event: CategoryCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Category created: ${event.category.id} - ${event.category.name}`);
      
      // Transform domain event to integration event
      const payload = {
        id: event.category.id,
        menuId: event.category.menuId,
        name: event.category.name,
        description: event.category.description,
        image: event.category.image,
        displayOrder: event.category.displayOrder,
        active: event.category.active,
        parentCategoryId: event.category.parentCategoryId,
        metadata: event.category.metadata,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('category.created', payload);
    } catch (error) {
      this.handleError(error, `Error handling CategoryCreatedEvent for category ${event.category.id}`);
    }
  }
} 
