import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { MenuItemUpdatedEvent } from '../../../domain/events/menu-item/menu-item-updated.event';
import { IEventPublisher } from '@app/common';
import { IMenuItemDomainRepository } from '../../../domain/repositories/menu-item/menu-item.repository.interface';
import { MenuItemNotFoundException } from '../../../domain/exceptions';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(MenuItemUpdatedEvent)
export class MenuItemUpdatedHandler extends BaseEventHandler implements IEventHandler<MenuItemUpdatedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    @Inject('IMenuItemDomainRepository')
    private readonly menuItemRepository: IMenuItemDomainRepository
  ) {
    super(MenuItemUpdatedHandler.name);
  }

  async handle(event: MenuItemUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`Menu item updated: ${event.menuItemId}`);
      
      // Fetch the updated menu item to include in the event
      const menuItem = await this.menuItemRepository.findById(event.menuItemId);
      
      if (!menuItem) {
        throw new MenuItemNotFoundException(event.menuItemId);
      }
      
      // Transform domain event to integration event
      const payload = {
        id: menuItem.id,
        categoryId: menuItem.categoryId,
        name: menuItem.name,
        price: menuItem.price,
        discountedPrice: menuItem.discountedPrice,
        description: menuItem.description,
        available: menuItem.available,
        dietary: menuItem.dietary ? {
          vegetarian: menuItem.dietary.vegetarian,
          vegan: menuItem.dietary.vegan,
          glutenFree: menuItem.dietary.glutenFree,
          nutFree: menuItem.dietary.nutFree
        } : null,
        timestamp: new Date().toISOString()
      };

      // Publish to message broker for cross-service communication
      await this.eventPublisher.publish('menu.item.updated', payload);
    } catch (error) {
      this.handleError(error, `Error handling MenuItemUpdatedEvent for item ${event.menuItemId}`);
    }
  }
} 
