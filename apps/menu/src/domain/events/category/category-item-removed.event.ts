import { Category } from '../../entities/category.entity';

export class CategoryItemRemovedEvent {
    constructor(
      public readonly categoryId: string,
      public readonly itemId: string
    ) {}
  }