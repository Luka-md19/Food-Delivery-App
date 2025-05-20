import { MenuHandlers } from './menu';
import { MenuItemHandlers } from './menu-item';
import { CategoryHandlers } from './category';

export const EventHandlers = [
  ...MenuHandlers,
  ...MenuItemHandlers,
  ...CategoryHandlers,
];

export * from './menu';
export * from './menu-item';
export * from './category'; 