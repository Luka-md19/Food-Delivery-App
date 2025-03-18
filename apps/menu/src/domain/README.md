# Domain Directory

This directory contains domain-specific code that represents the core business logic and entities.

## Structure

- **entities/**: Domain entity classes
- **events/**: Domain event definitions
- **repositories/**: Repository interfaces for domain entities
- **services/**: Domain-specific services
- **value-objects/**: Value objects used in the domain
- **exceptions/**: Domain-specific exceptions

## Domain-Driven Design

This directory follows Domain-Driven Design (DDD) principles:

1. **Entities**: Objects with identity and lifecycle
2. **Value Objects**: Immutable objects without identity
3. **Aggregates**: Cluster of entities and value objects with a root entity
4. **Domain Events**: Objects representing something that happened in the domain
5. **Repositories**: Abstractions for data access
6. **Domain Services**: Services that encapsulate domain operations not belonging to a specific entity

## Best Practices

1. Keep domain logic separate from infrastructure concerns
2. Use rich domain models with behavior, not just data
3. Use value objects for concepts with no identity
4. Encapsulate complex business rules in domain services
5. Use domain events to decouple parts of the system
6. Define clear boundaries between aggregates

## Example: Domain Entity

```typescript
export class Menu {
  private _id: string;
  private _name: string;
  private _categories: string[] = [];
  
  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }
  
  addCategory(categoryId: string): void {
    if (!this._categories.includes(categoryId)) {
      this._categories.push(categoryId);
    }
  }
  
  removeCategory(categoryId: string): void {
    this._categories = this._categories.filter(id => id !== categoryId);
  }
}
``` 