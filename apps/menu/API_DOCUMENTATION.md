# Menu Service API Documentation

## Overview

The Menu Service is responsible for managing restaurant menus, categories, and menu items in the food delivery application. It follows Domain-Driven Design (DDD) principles to ensure that business rules are properly encapsulated and enforced.

## Base URL

```
/menus
```

## Authentication

All endpoints require authentication using a JWT token. The token should be included in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <token>
```

## Error Handling

All errors follow a standard format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Error type",
  "path": "/menus/123",
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

The API implements rate limiting to protect against abuse. The limits are:

- Default: 100 requests per minute
- Short: 5 requests per second
- Medium: 20 requests per 10 seconds

When rate limits are exceeded, the API will return a `429 Too Many Requests` response.

## Endpoints

### Menus

#### Get All Menus

```
GET /menus
```

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

Response:
```json
{
  "items": [
    {
      "id": "60d21b4667d0d8992e610c85",
      "restaurantId": "60d21b4667d0d8992e610c84",
      "name": "Lunch Menu",
      "description": "Available weekdays from 11am to 3pm",
      "active": true,
      "availability": {
        "daysOfWeek": [1, 2, 3, 4, 5],
        "startTime": "11:00",
        "endTime": "15:00"
      },
      "categories": ["60d21b4667d0d8992e610c86"],
      "metadata": {},
      "createdAt": "2023-03-13T19:26:00.000Z",
      "updatedAt": "2023-03-13T19:26:00.000Z",
      "version": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

#### Get Menu by ID

```
GET /menus/:id
```

Path Parameters:
- `id`: Menu ID

Response:
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "categories": ["60d21b4667d0d8992e610c86"],
  "metadata": {},
  "createdAt": "2023-03-13T19:26:00.000Z",
  "updatedAt": "2023-03-13T19:26:00.000Z",
  "version": 1
}
```

#### Get Menus by Restaurant ID

```
GET /menus/restaurant/:restaurantId
```

Path Parameters:
- `restaurantId`: Restaurant ID

Query Parameters:
- `activeOnly` (optional): Whether to return only active menus (default: false)

Response:
```json
[
  {
    "id": "60d21b4667d0d8992e610c85",
    "restaurantId": "60d21b4667d0d8992e610c84",
    "name": "Lunch Menu",
    "description": "Available weekdays from 11am to 3pm",
    "active": true,
    "availability": {
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startTime": "11:00",
      "endTime": "15:00"
    },
    "categories": ["60d21b4667d0d8992e610c86"],
    "metadata": {},
    "createdAt": "2023-03-13T19:26:00.000Z",
    "updatedAt": "2023-03-13T19:26:00.000Z",
    "version": 1
  }
]
```

#### Create Menu

```
POST /menus
```

Request Body:
```json
{
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "metadata": {}
}
```

Response:
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "categories": [],
  "metadata": {},
  "createdAt": "2023-03-13T19:26:00.000Z",
  "updatedAt": "2023-03-13T19:26:00.000Z",
  "version": 1
}
```

#### Update Menu

```
PUT /menus/:id
```

Path Parameters:
- `id`: Menu ID

Request Body:
```json
{
  "name": "Updated Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "metadata": {}
}
```

Response:
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Updated Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "categories": ["60d21b4667d0d8992e610c86"],
  "metadata": {},
  "createdAt": "2023-03-13T19:26:00.000Z",
  "updatedAt": "2023-03-13T19:26:00.000Z",
  "version": 2
}
```

#### Delete Menu

```
DELETE /menus/:id
```

Path Parameters:
- `id`: Menu ID

Response:
- Status: 204 No Content

#### Add Category to Menu

```
POST /menus/:menuId/categories/:categoryId
```

Path Parameters:
- `menuId`: Menu ID
- `categoryId`: Category ID

Response:
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "categories": ["60d21b4667d0d8992e610c86"],
  "metadata": {},
  "createdAt": "2023-03-13T19:26:00.000Z",
  "updatedAt": "2023-03-13T19:26:00.000Z",
  "version": 2
}
```

#### Remove Category from Menu

```
DELETE /menus/:menuId/categories/:categoryId
```

Path Parameters:
- `menuId`: Menu ID
- `categoryId`: Category ID

Response:
```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "categories": [],
  "metadata": {},
  "createdAt": "2023-03-13T19:26:00.000Z",
  "updatedAt": "2023-03-13T19:26:00.000Z",
  "version": 3
}
```

#### Health Check

```
GET /menus/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2023-03-13T19:26:00.000Z",
  "service": "menu-service",
  "version": "1.0.0"
}
```

## Event-Driven Architecture

The Menu Service uses an event-driven architecture to communicate with other services. When certain actions occur in the Menu Service, events are published to RabbitMQ for other services to consume.

### Published Events

#### Menu Created

Published when a new menu is created.

```json
{
  "id": "60d21b4667d0d8992e610c85",
  "restaurantId": "60d21b4667d0d8992e610c84",
  "name": "Lunch Menu",
  "description": "Available weekdays from 11am to 3pm",
  "active": true,
  "availability": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "11:00",
    "endTime": "15:00"
  },
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

#### Category Added

Published when a category is added to a menu.

```json
{
  "menuId": "60d21b4667d0d8992e610c85",
  "categoryId": "60d21b4667d0d8992e610c86",
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

#### Category Removed

Published when a category is removed from a menu.

```json
{
  "menuId": "60d21b4667d0d8992e610c85",
  "categoryId": "60d21b4667d0d8992e610c86",
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

#### Menu Item Created

Published when a new menu item is created.

```json
{
  "id": "60d21b4667d0d8992e610c87",
  "categoryId": "60d21b4667d0d8992e610c86",
  "name": "Chicken Sandwich",
  "price": 9.99,
  "description": "Grilled chicken with lettuce and tomato",
  "available": true,
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "glutenFree": false,
    "nutFree": true
  },
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

#### Menu Item Updated

Published when a menu item is updated.

```json
{
  "id": "60d21b4667d0d8992e610c87",
  "categoryId": "60d21b4667d0d8992e610c86",
  "name": "Chicken Sandwich",
  "price": 10.99,
  "discountedPrice": 8.99,
  "description": "Grilled chicken with lettuce and tomato",
  "available": true,
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "glutenFree": false,
    "nutFree": true
  },
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

#### Menu Item Removed

Published when a menu item is removed.

```json
{
  "id": "60d21b4667d0d8992e610c87",
  "categoryId": "60d21b4667d0d8992e610c86",
  "timestamp": "2023-03-13T19:26:00.000Z"
}
```

## Domain-Driven Design

The Menu Service follows Domain-Driven Design (DDD) principles to ensure that business rules are properly encapsulated and enforced. The key DDD concepts used in the service are:

### Aggregate Roots

- **Menu**: The main aggregate root that represents a restaurant menu
- **Category**: Represents a category within a menu
- **MenuItem**: Represents an item within a category

### Value Objects

- **Availability**: Represents the availability settings for a menu
- **DietaryInfo**: Represents dietary information for a menu item

### Domain Events

Domain events are used to communicate significant occurrences within the domain. They are published to RabbitMQ for other services to consume.

### Domain Services

Domain services contain business logic that doesn't naturally fit within a single entity or value object. For example, the `MenuAvailabilityService` handles complex availability logic.

### Repositories

Domain repositories provide an abstraction over the persistence mechanism, allowing domain entities to be retrieved and stored without exposing infrastructure details.

## Error Handling

The service uses a global exception filter to handle all exceptions in a consistent way. Custom domain exceptions are used to represent domain-specific error conditions.

### Domain Exceptions

- **MenuNotFoundException**: Thrown when a menu is not found
- **CategoryNotFoundException**: Thrown when a category is not found
- **MenuItemNotFoundException**: Thrown when a menu item is not found
- **InvalidMenuOperationException**: Thrown when an invalid operation is attempted on a menu

## Circuit Breaker

The service uses a circuit breaker pattern to handle failures when publishing events to RabbitMQ. This prevents cascading failures and allows the service to continue functioning even when RabbitMQ is unavailable.

## Rate Limiting

The service uses rate limiting to protect against abuse. The limits are:

- Default: 100 requests per minute
- Short: 5 requests per second
- Medium: 20 requests per 10 seconds 