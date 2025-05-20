import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { MenuUpdatedEvent } from '../../../domain/events/menu/menu-updated.event';
import { IEventPublisher } from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';
import { BaseEventHandler } from '../base.handler';
import { IMenuDomainRepository } from '../../../domain/repositories/menu/menu.repository.interface';
import { MenuNotFoundException } from '../../../domain/exceptions';

@Injectable()
@EventsHandler(MenuUpdatedEvent)
export class MenuUpdatedHandler extends BaseEventHandler implements IEventHandler<MenuUpdatedEvent> {
  constructor(
    @Inject(CommonEventPublisher)
    private readonly eventPublisher: IEventPublisher,
    @Inject('IMenuDomainRepository')
    private readonly menuRepository: IMenuDomainRepository
  ) {
    super(MenuUpdatedHandler.name);
  }

  async handle(event: MenuUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`Menu updated: ${event.menuId}`);
      
      // Fetch the updated menu to include in the event
      const menu = await this.menuRepository.findById(event.menuId);
      
      if (!menu) {
        throw new MenuNotFoundException(event.menuId);
      }
      
      // Transform domain event to integration event
      const payload = {
        id: menu.id,
        restaurantId: menu.restaurantId,
        name: menu.name,
        description: menu.description,
        active: menu.active,
        availability: menu.availability ? {
          daysOfWeek: menu.availability.daysOfWeek,
          startTime: menu.availability.startTime,
          endTime: menu.availability.endTime
        } : null,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.updated', payload);
    } catch (error) {
      this.handleError(error, `Error handling MenuUpdatedEvent for menu ${event.menuId}`);
    }
  }
} 
