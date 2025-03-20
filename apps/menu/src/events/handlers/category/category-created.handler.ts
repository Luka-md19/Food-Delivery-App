import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { CategoryCreatedEvent } from '../../../domain/events/category/category-created.event';
import { EventPublisher } from '../../publishers/event-publisher';

@Injectable()
@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedHandler implements IEventHandler<CategoryCreatedEvent> {
  private readonly logger = new Logger(CategoryCreatedHandler.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: CategoryCreatedEvent): Promise<void> {
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
  }
} 