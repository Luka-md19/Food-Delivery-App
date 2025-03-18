import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { MenuItemRemovedEvent } from '../../domain/events/menu-item-removed.event';
import { EventPublisher } from '../publishers/event-publisher';

@Injectable()
@EventsHandler(MenuItemRemovedEvent)
export class MenuItemRemovedHandler implements IEventHandler<MenuItemRemovedEvent> {
  private readonly logger = new Logger(MenuItemRemovedHandler.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: MenuItemRemovedEvent): Promise<void> {
    this.logger.log(`Menu item removed: ${event.menuItemId} from category ${event.categoryId}`);
    
    // Transform domain event to integration event
    const payload = {
      id: event.menuItemId,
      categoryId: event.categoryId,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('menu.item.removed', payload);
  }
} 