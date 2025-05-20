import { Menu } from '../../entities/menu.entity';

export class MenuUpdatedEvent {
  constructor(public readonly menuId: string) {}
} 