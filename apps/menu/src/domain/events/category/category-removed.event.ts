import { Menu } from '../../entities/menu.entity';

export class CategoryRemovedEvent {
  constructor(
    public readonly menuId: string,
    public readonly categoryId: string
  ) {}
} 