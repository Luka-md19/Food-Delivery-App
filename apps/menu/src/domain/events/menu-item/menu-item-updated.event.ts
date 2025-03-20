import { MenuItem } from '../../entities/menu-item.entity';

export class MenuItemUpdatedEvent {
    constructor(
        public readonly menuItemId: string,
        public readonly updates: any,
    ) {}
  }