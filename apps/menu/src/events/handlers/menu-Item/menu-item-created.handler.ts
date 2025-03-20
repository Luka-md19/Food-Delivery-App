import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '../../publishers/event-publisher';
import { MenuItemCreatedEvent } from '../../../domain/events/menu-item/menu-item-created.event';

@Injectable()
@EventsHandler(MenuItemCreatedEvent)
export class MenuItemCreatedHandler implements IEventHandler<MenuItemCreatedEvent> {
  private readonly logger = new Logger(MenuItemCreatedHandler.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  async handle(event: MenuItemCreatedEvent): Promise<void> {
    this.logger.log(`Menu item created: ${event.menuItem.id} - ${event.menuItem.name}`);
    
    // Transform domain event to integration event
    const payload = {
      id: event.menuItem.id,
      categoryId: event.menuItem.categoryId,
      name: event.menuItem.name,
      price: event.menuItem.price,
      description: event.menuItem.description,
      available: event.menuItem.available,
      dietary: event.menuItem.dietary ? {
        vegetarian: event.menuItem.dietary.vegetarian,
        vegan: event.menuItem.dietary.vegan,
        glutenFree: event.menuItem.dietary.glutenFree,
        nutFree: event.menuItem.dietary.nutFree
      } : null,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('menu.item.created', payload);
  }
} 