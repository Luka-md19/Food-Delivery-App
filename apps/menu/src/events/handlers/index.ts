import { MenuHandlers } from './menu';
import { MenuItemHandlers } from './menu-Item';
import { CategoryHandlers } from './category';

export const EventHandlers = [
  ...MenuHandlers,
  ...MenuItemHandlers,
  ...CategoryHandlers,
];

export * from './menu';
export * from './menu-Item';
export * from './category'; 