export class CategoryDeletedEvent {
  constructor(
    public readonly categoryId: string,
    public readonly menuId?: string
  ) {}
} 