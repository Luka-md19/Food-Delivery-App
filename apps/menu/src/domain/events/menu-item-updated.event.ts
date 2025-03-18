export class MenuItemUpdatedEvent {
    constructor(
        public readonly menuItemId: string,
        public readonly categoryId: string,
    ) {}
  }