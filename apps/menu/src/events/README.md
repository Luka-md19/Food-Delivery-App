# Events Directory

This directory contains the implementation of the event handling system for the application.

## Structure

- **handlers/**: Event handler classes
- **publishers/**: Classes responsible for publishing events
- **services/**: Services related to event processing

## Event System

The event system follows these patterns:

1. **Domain Events**: Events represent something that happened in the domain
2. **Event Handlers**: Process events and perform side effects
3. **Event Publishers**: Distribute events to handlers and external systems
4. **Retry Mechanism**: Handles failed event publications

## Handlers

Event handlers:
1. Listen for specific domain events
2. Execute business logic in response to events
3. May trigger external services or publish additional events
4. Are registered in the module's providers

## Publishers

Event publishers:
1. Take domain events and publish them
2. May send events to message brokers (RabbitMQ)
3. Include retry mechanisms for failed deliveries
4. Provide synchronous and asynchronous publication options

## Best Practices

1. Keep handlers focused on a single responsibility
2. Make event handling idempotent when possible
3. Design events with forward compatibility in mind
4. Include all necessary data in events for processing
5. Log event processing for debugging and monitoring
6. Use correlation IDs to track event chains

## Example Usage

```typescript
// Publishing an event
@Injectable()
export class MenuService {
  constructor(private eventPublisher: EventPublisher) {}
  
  async createMenu(dto: CreateMenuDto): Promise<Menu> {
    // Create menu logic
    const menu = await this.menuRepository.create(dto);
    
    // Publish event
    await this.eventPublisher.publish(
      new MenuCreatedEvent(menu.id, menu)
    );
    
    return menu;
  }
}

// Handling an event
@Injectable()
@EventsHandler(MenuCreatedEvent)
export class MenuCreatedHandler implements IEventHandler<MenuCreatedEvent> {
  async handle(event: MenuCreatedEvent) {
    // Handle the event
    console.log(`Menu created: ${event.menuId}`);
    // Perform side effects
  }
} 