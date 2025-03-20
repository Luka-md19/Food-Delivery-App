import { MenuItemCreatedHandler } from './menu-item-created.handler';
import { MenuItemUpdatedHandler } from './menu-item-updated.handler';
import { MenuItemRemovedHandler } from './menu-item-removed.handler';

export const MenuItemHandlers = [
  MenuItemCreatedHandler,
  MenuItemUpdatedHandler,
  MenuItemRemovedHandler,
];

export * from './menu-item-created.handler';
export * from './menu-item-updated.handler';
export * from './menu-item-removed.handler';
