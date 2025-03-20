import { Menu } from '../../entities/menu.entity';

export class CategoryAddedEvent {
  constructor(
    public readonly menuId: string,
    public readonly categoryId: string
  ) {}
} 