import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { CategoryItemRemovedEvent } from '../../domain/events/category-item-removed.event';
import { EventPublisher } from '../publishers/event-publisher';
import { ICategoryDomainRepository } from '../../domain/repositories/category.repository.interface';

@Injectable()
@EventsHandler(CategoryItemRemovedEvent)
export class CategoryItemRemovedHandler implements IEventHandler<CategoryItemRemovedEvent> {
  private readonly logger = new Logger(CategoryItemRemovedHandler.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
    @Inject('ICategoryDomainRepository')
    private readonly categoryRepository: ICategoryDomainRepository
  ) {}

  async handle(event: CategoryItemRemovedEvent): Promise<void> {
    this.logger.log(`Item ${event.itemId} removed from category ${event.categoryId}`);
    
    // Fetch the category to include in the event
    const category = await this.categoryRepository.findById(event.categoryId);
    
    if (!category) {
      this.logger.warn(`Category not found for event: ${event.categoryId}`);
      return;
    }
    
    // Transform domain event to integration event
    const payload = {
      categoryId: event.categoryId,
      categoryName: category.name,
      itemId: event.itemId,
      menuId: category.menuId,
      timestamp: new Date().toISOString()
    };

    // Publish to message broker for cross-service communication
    await this.eventPublisher.publish('category.item.removed', payload);
  }
} 