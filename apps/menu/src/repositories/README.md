# Repositories Directory

This directory contains repository classes that handle data access logic for the application.

## Repositories

- **MenuRepository**: Manages persistence of menu entities
- **CategoryRepository**: Manages persistence of category entities
- **FailedMessageRepository**: Manages persistence of failed message records for retry

## Architecture

Repositories in this directory follow these patterns:

1. They implement interfaces defined in the domain layer
2. They extend BaseRepository for common functionality
3. They encapsulate all data access logic
4. They handle database-specific operations and mapping

## Repository Interfaces

All repositories implement interfaces from the domain layer:

```typescript
export interface IMenuRepository {
  findAll(filter: any, page: number, limit: number): Promise<Menu[]>;
  findById(id: string): Promise<Menu | null>;
  create(menu: any): Promise<Menu>;
  // ... other methods
}
```

## Repository Implementation

A typical repository implementation:

```typescript
@Injectable()
export class MenuRepository extends BaseRepository implements IMenuRepository {
  constructor(
    @InjectModel(Menu.name) private menuModel: Model<MenuDocument>
  ) {
    super();
  }

  async findAll(filter: any, page: number, limit: number): Promise<Menu[]> {
    return this.menuModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }
  
  // ... other methods
}
```

## Recommended Organization

For better maintainability, consider organizing repositories by entity in subdirectories, similar to the DTO structure. 