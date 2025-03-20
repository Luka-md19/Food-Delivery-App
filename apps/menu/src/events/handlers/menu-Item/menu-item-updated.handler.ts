import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { MenuItemUpdatedEvent } from '../../../domain/events/menu-item/menu-item-updated.event';
import { EventPublisher } from '../../publishers/event-publisher';
import { IMenuItemDomainRepository } from '../../../domain/repositories/menu-item/menu-item.repository.interface';

@Injectable()
@EventsHandler(MenuItemUpdatedEvent)
export class MenuItemUpdatedHandler implements IEventHandler<MenuItemUpdatedEvent> {
  private readonly logger = new Logger(MenuItemUpdatedHandler.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
    @Inject('IMenuItemDomainRepository')
    private readonly menuItemRepository: IMenuItemDomainRepository
  ) {}

  async handle(event: MenuItemUpdatedEvent): Promise<void> {
    this.logger.log(`Menu item updated: ${event.menuItemId}`);
    
    // Fetch the updated menu item to include in the event
    const menuItem = await this.menuItemRepository.findById(event.menuItemId);
    
    if (!menuItem) {
      this.logger.warn(`Menu item not found for event: ${event.menuItemId}`);
      return;
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
  }
} 