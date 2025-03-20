import { MenuItem } from '../../entities/menu-item.entity';

export class MenuItemRemovedEvent {
  constructor(
    public readonly menuItemId: string,
    public readonly categoryId: string,
  ) {}
} 