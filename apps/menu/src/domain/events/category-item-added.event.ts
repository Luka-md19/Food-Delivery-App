export class CategoryItemAddedEvent {
    constructor(
      public readonly categoryId: string,
      public readonly itemId: string
    ) {}
  }