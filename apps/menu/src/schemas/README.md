# Schemas Directory

This directory contains MongoDB schema definitions for the application using Mongoose.

## Schemas

- **Menu**: Schema for menu documents
- **Category**: Schema for category documents
- **MenuItem**: Schema for menu item documents
- **FailedMessage**: Schema for tracking failed message deliveries

## Architecture

Schemas in this directory follow these patterns:

1. They define the structure of MongoDB documents using Mongoose
2. They include validation rules and default values
3. They define indexes for performance optimization
4. They use TypeScript interfaces to define document types

## Schema Implementation

Each schema includes:

- Field definitions with types and validation
- Timestamps for tracking creation and updates
- Indexes for query optimization
- Virtual properties when needed
- Schema hooks for pre/post operations

## Best Practices

1. Keep schemas focused on data structure, not business logic
2. Use schema validation for data integrity
3. Design schemas with query patterns in mind
4. Define appropriate indexes for frequent queries
5. Use subdocuments for closely related data
6. Keep schema definitions consistent with domain models

## Recommended Organization

For better maintainability, consider organizing schemas by entity in subdirectories, similar to the DTO structure:

```
schemas/
├── menu/
│   ├── menu.schema.ts
│   ├── menu.interface.ts
├── category/
│   ├── category.schema.ts
│   ├── category.interface.ts
├── menu-item/
│   ├── menu-item.schema.ts
│   ├── menu-item.interface.ts
``` 