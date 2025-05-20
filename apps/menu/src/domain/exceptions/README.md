# Menu Microservice Exception Handling

This document outlines the exception handling pattern implemented in the Menu microservice, following SOLID principles and Domain-Driven Design (DDD) best practices.

## Domain Exception Structure

The exception structure adheres to the following principles:
- Domain-specific exceptions are separated from infrastructure concerns
- Exceptions are categorized by domain context
- Common exception types are reusable across the domain
- All domain exceptions extend from a common base class

### Exception Hierarchy

```
MenuDomainException (base class)
├── Common Exceptions
│   ├── ValidationException
│   ├── AuthorizationException
│   └── ResourceConflictException
├── Menu Exceptions
│   ├── MenuNotFoundException
│   └── InvalidMenuOperationException
├── Category Exceptions
│   ├── CategoryNotFoundException
│   └── InvalidCategoryOperationException
└── MenuItem Exceptions
    ├── MenuItemNotFoundException
    └── InvalidMenuItemOperationException
```

## Usage Guidelines

### Where to Throw Exceptions

- **Domain Repositories**: Throw domain-specific exceptions when operations fail
- **Domain Services**: Validate domain rules and throw appropriate exceptions
- **Domain Entities**: Enforce invariants and throw exceptions when business rules are violated
- **Application Services**: Convert infrastructure exceptions to domain exceptions when necessary

### Where to Catch Exceptions

- **Application Layer**: Catch domain exceptions to convert them to API responses
- **Controllers**: Handle remaining uncaught exceptions
- **Global Exception Filter**: Catch all unhandled exceptions

### Naming Conventions

- All domain exceptions should be descriptive and follow the pattern `[Entity][ProblemType]Exception`
- Base exceptions should be named `[Domain]Exception`

### Extending for New Cases

To add a new exception type:
1. Create a new class extending `MenuDomainException`
2. Implement a constructor that provides a clear error message
3. Set the appropriate HTTP status code
4. Export the exception from the appropriate index file

## Common Exceptions

### ValidationException
Thrown when data validation fails within the domain.

### AuthorizationException
Thrown when an operation is not authorized on a resource.

### ResourceConflictException
Thrown when a resource conflict occurs, such as duplicate entries.

## Menu Exceptions

### MenuNotFoundException
Thrown when a menu cannot be found by its identifier.

### InvalidMenuOperationException
Thrown when an invalid operation is attempted on a menu.

## Category Exceptions

### CategoryNotFoundException
Thrown when a category cannot be found by its identifier.

### InvalidCategoryOperationException
Thrown when an invalid operation is attempted on a category.

## MenuItem Exceptions

### MenuItemNotFoundException
Thrown when a menu item cannot be found by its identifier.

### InvalidMenuItemOperationException
Thrown when an invalid operation is attempted on a menu item.

## Example

### Throwing an exception in a domain repository

```typescript
async save(category: Category): Promise<Category> {
  const categoryData = category.toPersistence();
  
  // If the category has an ID, update it; otherwise, create it
  if (categoryData._id) {
    const { _id, ...updateData } = categoryData;
    const updatedCategoryData = await this.categoryRepository.update(_id, updateData);
    if (!updatedCategoryData) {
      throw new CategoryNotFoundException(_id);
    }
    return Category.fromPersistence(updatedCategoryData);
  } else {
    // For new categories, we need to create a new ID
    const newId = new ObjectId().toString();
    const newCategory = Category.create({
      id: newId,
      menuId: categoryData.menuId,
      name: categoryData.name,
      description: categoryData.description,
      image: categoryData.image,
      displayOrder: categoryData.displayOrder,
      active: categoryData.active,
      parentCategoryId: categoryData.parentCategoryId,
      metadata: categoryData.metadata
    });
    
    const createdCategoryData = await this.categoryRepository.create(newCategory.toPersistence());
    if (!createdCategoryData) {
      throw new ResourceConflictException('category', newId, 'Failed to create category');
    }
    return Category.fromPersistence(createdCategoryData);
  }
}
```

### Catching exceptions in an application service

```typescript
async updateCategory(id: string, updateData: UpdateCategoryDto): Promise<CategoryResponseDto> {
  try {
    const category = await this.categoryDomainRepository.findById(id);
    if (!category) {
      throw new CategoryNotFoundException(id);
    }
    
    category.update(updateData);
    const savedCategory = await this.categoryDomainRepository.save(category);
    return this.categoryMapper.toDto(savedCategory);
  } catch (error) {
    // Log the error
    this.errorHandler.handleError(error);
    
    // Re-throw domain exceptions for the controller to handle
    if (error instanceof MenuDomainException) {
      throw error;
    }
    
    // Convert other errors to domain exceptions
    throw new MenuDomainException('Failed to update category', HttpStatus.INTERNAL_SERVER_ERROR);
  }
} 