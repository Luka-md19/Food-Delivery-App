import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { MenuDeletedEvent } from '../../../domain/events/menu/menu-deleted.event';
import { IEventPublisher } from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(MenuDeletedEvent)
export class MenuDeletedHandler extends BaseEventHandler implements IEventHandler<MenuDeletedEvent> {
  constructor(
    @Inject(CommonEventPublisher)
    private readonly eventPublisher: IEventPublisher
  ) {
    super(MenuDeletedHandler.name);
  }

  async handle(event: MenuDeletedEvent): Promise<void> {
    try {
      this.logger.log(`Menu deleted: ${event.menuId} for restaurant ${event.restaurantId}`);
      
      // Transform domain event to integration event
      const payload = {
        id: event.menuId,
        restaurantId: event.restaurantId,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.deleted', payload);
    } catch (error) {
      this.handleError(error, `Error handling MenuDeletedEvent for menu ${event.menuId}`);
    }
  }
} 
