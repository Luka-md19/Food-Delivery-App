import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CategoryDeletedEvent } from '../../../domain/events/category/category-deleted.event';
import { IEventPublisher } from '@app/common';
import { BaseEventHandler } from '../base.handler';

@Injectable()
@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler extends BaseEventHandler implements IEventHandler<CategoryDeletedEvent> {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    @Inject('IMenuDomainRepository') private readonly menuRepository: any,
    @Inject('IMenuItemDomainRepository') private readonly menuItemRepository: any
  ) {
    super(CategoryDeletedHandler.name);
  }

  async handle(event: CategoryDeletedEvent): Promise<void> {
    try {
      this.logger.log(`Category deleted: ${event.categoryId} from menu: ${event.menuId || 'unknown'}`);
      
      // 1. Clean up menu references to this category
      if (event.menuId) {
        this.logger.log(`Removing category ${event.categoryId} from menu ${event.menuId}`);
        try {
          // Get the menu document
          const menu = await this.menuRepository.findById(event.menuId);
          if (menu) {
            // Remove the category from the menu's categories array
            this.logger.log(`Found menu ${event.menuId}, removing category ${event.categoryId}`);
            
            // Update the menu entity with the removed category
            menu.removeCategory(event.categoryId);
            
            // Save the updated menu
            await this.menuRepository.save(menu);
            this.logger.log(`Successfully removed category ${event.categoryId} from menu ${event.menuId}`);
          } else {
            this.logger.warn(`Menu ${event.menuId} not found when trying to remove category ${event.categoryId}`);
          }
        } catch (error) {
          this.logger.error(`Error removing category ${event.categoryId} from menu ${event.menuId}: ${error.message}`);
        }
      } else {
        // If menuId not provided, find all menus referencing this category and remove it
        this.logger.log(`Finding and cleaning up all menu references to category ${event.categoryId}`);
        try {
          const menusWithCategory = await this.menuRepository.findMenuByCategoryId(event.categoryId);
          this.logger.log(`Found ${menusWithCategory.length} menus referencing category ${event.categoryId}`);
          
          for (const menu of menusWithCategory) {
            try {
              // Update the menu entity with the removed category
              menu.removeCategory(event.categoryId);
              
              // Save the updated menu
              await this.menuRepository.save(menu);
              this.logger.log(`Successfully removed category ${event.categoryId} from menu ${menu.id}`);
            } catch (menuError) {
              this.logger.error(`Error updating menu ${menu.id}: ${menuError.message}`);
            }
          }
        } catch (findError) {
          this.logger.error(`Error finding menus with category ${event.categoryId}: ${findError.message}`);
        }
      }
      
      // 2. Delete or reassign all menu items associated with this category
      this.logger.log(`Deleting menu items associated with category ${event.categoryId}`);
      try {
        const menuItems = await this.menuItemRepository.findByCategoryId(event.categoryId);
        this.logger.log(`Found ${menuItems.length} menu items to delete for category ${event.categoryId}`);
        
        for (const item of menuItems) {
          try {
            await this.menuItemRepository.delete(item.id);
            this.logger.log(`Deleted menu item ${item.id}`);
          } catch (deleteError) {
            this.logger.error(`Error deleting menu item ${item.id}: ${deleteError.message}`);
          }
        }
      } catch (findItemsError) {
        this.logger.error(`Error finding menu items for category ${event.categoryId}: ${findItemsError.message}`);
      }
      
      // 3. Transform domain event to integration event for cross-service communication
      try {
        const payload = {
          categoryId: event.categoryId,
          menuId: event.menuId,
          timestamp: new Date().toISOString(),
          itemsDeleted: 0 // We'll update this in the actual implementation
        };

        // Publish to message broker for cross-service communication
        await this.eventPublisher.publish('menu.category.deleted', payload);
        this.logger.log(`Published menu.category.deleted event for category ${event.categoryId}`);
      } catch (publishError) {
        this.logger.error(`Error publishing menu.category.deleted event: ${publishError.message}`);
      }
    } catch (error) {
      this.handleError(error, `Error handling CategoryDeletedEvent for category ${event.categoryId}`);
    }
  }
} 
