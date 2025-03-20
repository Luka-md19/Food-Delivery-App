import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { CategoryItemAddedEvent } from '../../../domain/events/category/category-item-added.event';
import { EventPublisher } from '../../publishers/event-publisher';
import { ICategoryDomainRepository } from '../../../domain/repositories/category/category.repository.interface';
import { IMenuItemDomainRepository } from '../../../domain/repositories/menu-item/menu-item.repository.interface';

@Injectable()
@EventsHandler(CategoryItemAddedEvent)
export class CategoryItemAddedHandler implements IEventHandler<CategoryItemAddedEvent> {
  private readonly logger = new Logger(CategoryItemAddedHandler.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
    @Inject('ICategoryDomainRepository')
    private readonly categoryRepository: ICategoryDomainRepository,
    @Inject('IMenuItemDomainRepository')
    private readonly menuItemRepository: IMenuItemDomainRepository
  ) {}

  async handle(event: CategoryItemAddedEvent): Promise<void> {
    this.logger.log(`Item ${event.itemId} added to category ${event.categoryId}`);
    
    // Fetch the category and menu item to include in the event
    const [category, menuItem] = await Promise.all([
      this.categoryRepository.findById(event.categoryId),
      this.menuItemRepository.findById(event.itemId)
    ]);
    
    if (!category || !menuItem) {
      this.logger.warn(`Category or menu item not found for event: ${event.categoryId}, ${event.itemId}`);
      return;
    }
    
    // Transform domain event to integration event
    const payload = {
      categoryId: event.categoryId,
      categoryName: category.name,
      itemId: event.itemId,
      itemName: menuItem.name,
      menuId: category.menuId,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('category.item.added', payload);
  }
} 