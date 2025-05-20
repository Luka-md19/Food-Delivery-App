import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { IEventPublisher } from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';
import { MenuItemCreatedEvent } from '../../../domain/events/menu-item/menu-item-created.event';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(MenuItemCreatedEvent)
export class MenuItemCreatedHandler extends BaseEventHandler implements IEventHandler<MenuItemCreatedEvent> {
  constructor(
    @Inject(CommonEventPublisher)
    private readonly eventPublisher: IEventPublisher
  ) {
    super(MenuItemCreatedHandler.name);
  }

  async handle(event: MenuItemCreatedEvent): Promise<void> {
    try {
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
    } catch (error) {
      this.handleError(error, `Error handling MenuItemCreatedEvent for item ${event.menuItem.id}`);
    }
  }
} 
