export class MenuItemRemovedEvent {
  constructor(
    public readonly menuItemId: string,
    public readonly categoryId: string,
  ) {}
} 