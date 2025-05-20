import { CategoryCreatedHandler } from './category-created.handler';
import { CategoryAddedHandler } from './category-added.handler';
import { CategoryRemovedHandler } from './category-removed.handler';
import { CategoryItemAddedHandler } from './category-item-added.handler';
import { CategoryItemRemovedHandler } from './category-item-removed.handler';
import { CategoryDeletedHandler } from './category-deleted.handler';

export const CategoryHandlers = [
  CategoryCreatedHandler,
  CategoryAddedHandler,
  CategoryRemovedHandler,
  CategoryItemAddedHandler,
  CategoryItemRemovedHandler,
  CategoryDeletedHandler,
];

export * from './category-created.handler';
export * from './category-added.handler';
export * from './category-removed.handler';
export * from './category-item-added.handler';
export * from './category-item-removed.handler';
export * from './category-deleted.handler';
