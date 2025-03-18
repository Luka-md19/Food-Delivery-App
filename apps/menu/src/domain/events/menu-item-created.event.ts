import { MenuItem } from '../entities/menu-item.entity';

export class MenuItemCreatedEvent {
  constructor(public readonly menuItem: MenuItem) {}
}