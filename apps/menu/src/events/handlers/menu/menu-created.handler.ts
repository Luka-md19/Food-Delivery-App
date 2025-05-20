import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { MenuCreatedEvent } from '../../../domain/events/menu/menu-created.event';
import { IEventPublisher } from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(MenuCreatedEvent)
export class MenuCreatedHandler extends BaseEventHandler implements IEventHandler<MenuCreatedEvent> {
  constructor(
    @Inject(CommonEventPublisher)
    private readonly eventPublisher: IEventPublisher
  ) {
    super(MenuCreatedHandler.name);
  }

  async handle(event: MenuCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Menu created: ${event.menu.id} - ${event.menu.name}`);
      
      // Transform domain event to integration event
      const payload = {
        id: event.menu.id,
        restaurantId: event.menu.restaurantId,
        name: event.menu.name,
        description: event.menu.description,
        active: event.menu.active,
        availability: event.menu.availability ? {
          daysOfWeek: event.menu.availability.daysOfWeek,
          startTime: event.menu.availability.startTime,
          endTime: event.menu.availability.endTime
        } : null,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.created', payload);
      
      // Additional internal processing can be done here
      // For example: update cache, generate reports, etc.
    } catch (error) {
      this.handleError(error, `Error handling MenuCreatedEvent for menu ${event.menu.id}`);
    }
  }
} 
