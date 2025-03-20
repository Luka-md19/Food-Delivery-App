import { Menu } from '../../entities/menu.entity';

export class MenuCreatedEvent {
  constructor(public readonly menu: Menu) {}
} 