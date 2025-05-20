import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { MenuItemRemovedEvent } from '../../../domain/events/menu-item/menu-item-removed.event';
import { IEventPublisher } from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(MenuItemRemovedEvent)
export class MenuItemRemovedHandler extends BaseEventHandler implements IEventHandler<MenuItemRemovedEvent> {
  constructor(
    @Inject(CommonEventPublisher)
    private readonly eventPublisher: IEventPublisher,
  ) {
    super(MenuItemRemovedHandler.name);
  }

  async handle(event: MenuItemRemovedEvent): Promise<void> {
    try {
      this.logger.log(`Menu item removed: ${event.menuItemId} from category ${event.categoryId}`);
      
      // Transform domain event to integration event
      const payload = {
        id: event.menuItemId,
        categoryId: event.categoryId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.item.removed', payload);
    } catch (error) {
      this.handleError(error, `Error handling MenuItemRemovedEvent for item ${event.menuItemId}`);
    }
  }
} 
