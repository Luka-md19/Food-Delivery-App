import { MenuCreatedHandler } from './menu-created.handler';
import { MenuUpdatedHandler } from './menu-updated.handler';
import { MenuDeletedHandler } from './menu-deleted.handler';

export const MenuHandlers = [
  MenuCreatedHandler,
  MenuUpdatedHandler,
  MenuDeletedHandler,
];

export * from './menu-created.handler';
export * from './menu-updated.handler';
export * from './menu-deleted.handler'; 