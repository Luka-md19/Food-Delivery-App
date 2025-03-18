export class CategoryRemovedEvent {
  constructor(
    public readonly menuId: string,
    public readonly categoryId: string
  ) {}
} 