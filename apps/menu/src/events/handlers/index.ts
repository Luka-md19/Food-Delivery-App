import { MenuCreatedHandler } from './menu-created.handler';
import { CategoryAddedHandler } from './category-added.handler';
import { CategoryRemovedHandler } from './category-removed.handler';
import { CategoryCreatedHandler } from './category-created.handler';
import { CategoryItemAddedHandler } from './category-item-added.handler';
import { CategoryItemRemovedHandler } from './category-item-removed.handler';
import { MenuItemCreatedHandler } from './menu-item-created.handler';
import { MenuItemUpdatedHandler } from './menu-item-updated.handler';
import { MenuItemRemovedHandler } from './menu-item-removed.handler';

export const EventHandlers = [
  MenuCreatedHandler,
  CategoryAddedHandler,
  CategoryRemovedHandler,
  CategoryCreatedHandler,
  CategoryItemAddedHandler,
  CategoryItemRemovedHandler,
  MenuItemCreatedHandler,
  MenuItemUpdatedHandler,
  MenuItemRemovedHandler,
];

export * from './menu-created.handler';
export * from './category-added.handler';
export * from './category-removed.handler';
export * from './category-created.handler';
export * from './category-item-added.handler';
export * from './category-item-removed.handler';
export * from './menu-item-created.handler';
export * from './menu-item-updated.handler';
export * from './menu-item-removed.handler'; 