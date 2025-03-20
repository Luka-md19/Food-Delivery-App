import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { CategoryRemovedEvent } from '../../../domain/events/category/category-removed.event';
import { EventPublisher } from '../../publishers/event-publisher';

@Injectable()
@EventsHandler(CategoryRemovedEvent)
export class CategoryRemovedHandler implements IEventHandler<CategoryRemovedEvent> {
  private readonly logger = new Logger(CategoryRemovedHandler.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  async handle(event: CategoryRemovedEvent): Promise<void> {
    this.logger.log(`Category removed from menu: ${event.menuId} - Category: ${event.categoryId}`);
    
    // Transform domain event to integration event
    const payload = {
      menuId: event.menuId,
      categoryId: event.categoryId,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('menu.category.removed', payload);
  }
} 