import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '../../publishers/event-publisher';
import { CategoryAddedEvent } from '../../../domain/events/category/category-added.event';


@Injectable()
@EventsHandler(CategoryAddedEvent)
export class CategoryAddedHandler implements IEventHandler<CategoryAddedEvent> {
  private readonly logger = new Logger(CategoryAddedHandler.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  async handle(event: CategoryAddedEvent): Promise<void> {
    this.logger.log(`Category added to menu: ${event.menuId} - Category: ${event.categoryId}`);
    
    // Transform domain event to integration event
    const payload = {
      menuId: event.menuId,
      categoryId: event.categoryId,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('menu.category.added', payload);
  }
} 