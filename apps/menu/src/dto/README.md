# DTO Directory

This directory contains Data Transfer Objects (DTOs) used for input validation and response formatting.

## Current Structure

Currently, DTOs are organized at the root level:

- `create-menu.dto.ts`: For menu creation
- `update-menu.dto.ts`: For menu updates
- `menu-response.dto.ts`: For menu responses
- `menu-item.dto.ts`: For menu item operations
- `category.dto.ts`: For category operations
- `availability-dto.ts`: For availability settings

## Recommended Organization

For better maintainability, we recommend organizing DTOs by entity in subdirectories:

```
dto/
├── menu/
│   ├── create-menu.dto.ts
│   ├── update-menu.dto.ts
│   └── menu-response.dto.ts
├── category/
│   ├── create-category.dto.ts
│   ├── update-category.dto.ts
│   └── category-response.dto.ts
├── menu-item/
│   ├── create-menu-item.dto.ts
│   ├── update-menu-item.dto.ts
│   └── menu-item-response.dto.ts
└── common/
    └── availability.dto.ts
```

## DTO Best Practices

1. Use class-validator decorators for validation
2. Add descriptive API documentation with Swagger annotations
3. Include examples for each property
4. Use inheritance for shared properties
5. Keep DTOs focused on specific use cases
6. Maintain clean separation between input and output DTOs

## Migration Plan

1. Create entity-specific subdirectories
2. Move existing DTOs to appropriate directories
3. Update import paths throughout the application
4. Update the main index.ts to re-export from subdirectories 