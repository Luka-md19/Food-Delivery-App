import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { MenuCreatedEvent } from '../../domain/events/menu-created.event';
import { EventPublisher } from '../publishers/event-publisher';

@Injectable()
@EventsHandler(MenuCreatedEvent)
export class MenuCreatedHandler implements IEventHandler<MenuCreatedEvent> {
  private readonly logger = new Logger(MenuCreatedHandler.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  async handle(event: MenuCreatedEvent): Promise<void> {
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
  }
} 