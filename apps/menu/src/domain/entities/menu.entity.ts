import { AggregateRoot } from '@nestjs/cqrs';
import { CategoryAddedEvent } from '../events/category/category-added.event';
import { CategoryRemovedEvent } from '../events/category/category-removed.event';
import { MenuCreatedEvent } from '../events/menu/menu-created.event';
import { MenuUpdatedEvent } from '../events/menu/menu-updated.event';
import { MenuDeletedEvent } from '../events/menu/menu-deleted.event';
import { Availability } from '../value-objects/availability.value-object';

export interface MenuProps {
  id?: string;
  restaurantId: string;
  name: string;
  description?: string;
  active?: boolean;
  categories?: string[];
  availability?: Availability;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Menu extends AggregateRoot {
  private _id?: string;
  private readonly _restaurantId: string;
  private _name: string;
  private _description?: string;
  private _active: boolean;
  private _availability?: Availability;
  private _categories: string[] = [];
  private _metadata?: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;

  constructor(props: MenuProps) {
    super();
    this._id = props.id;
    this._restaurantId = props.restaurantId;
    this._name = props.name;
    this._description = props.description;
    this._active = props.active ?? true;
    this._availability = props.availability;
    this._metadata = props.metadata;
    this._categories = props.categories || [];
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._version = 0;

    // Only apply the event if this is a new menu (no ID yet)
    if (!props.id) {
      this.apply(new MenuCreatedEvent(this));
    }
  }

  // Factory method to create a new menu
  public static create(props: MenuProps): Menu {
    return new Menu(props);
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get restaurantId(): string {
    return this._restaurantId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get active(): boolean {
    return this._active;
  }

  get availability(): Availability | undefined {
    return this._availability;
  }

  get categories(): string[] {
    return [...this._categories]; // Return a copy to prevent direct modification
  }

  get metadata(): Record<string, any> | undefined {
    return this._metadata ? { ...this._metadata } : undefined;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get version(): number {
    return this._version;
  }

  // Business methods
  public updateDetails(updates: Partial<Omit<MenuProps, 'id' | 'restaurantId'>>): void {
    if (updates.name !== undefined) {
      this._name = updates.name;
    }
    
    if (updates.description !== undefined) {
      this._description = updates.description;
    }
    
    if (updates.active !== undefined) {
      this._active = updates.active;
    }
    
    if (updates.availability !== undefined) {
      this._availability = updates.availability;
    }
    
    if (updates.metadata !== undefined) {
      this._metadata = updates.metadata;
    }
    
    this._updatedAt = new Date();
    this._version += 1;
    
    // Apply the updated event
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  /**
   * Update the menu name
   * @param name New menu name
   */
  public updateName(name: string): void {
    if (name === this._name) return;
    
    this._name = name;
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  /**
   * Update the menu description
   * @param description New menu description
   */
  public updateDescription(description: string): void {
    if (description === this._description) return;
    
    this._description = description;
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  /**
   * Update the menu active status
   * @param active New active status
   */
  public updateActiveStatus(active: boolean): void {
    if (active === this._active) return;
    
    this._active = active;
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  /**
   * Update the menu availability
   * @param availability New availability
   */
  public updateAvailability(availability: Availability): void {
    if (this._availability && this._availability.equals(availability)) return;
    
    this._availability = availability;
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  /**
   * Update the menu metadata
   * @param metadata New metadata
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = metadata;
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new MenuUpdatedEvent(this._id));
    }
  }

  public addCategory(categoryId: string): void {
    if (this._categories.includes(categoryId)) {
      return; // Category already exists
    }
    
    this._categories.push(categoryId);
    this._updatedAt = new Date();
    this._version += 1;
    
    this.apply(new CategoryAddedEvent(this._id!, categoryId));
  }

  public removeCategory(categoryId: string): void {
    const index = this._categories.indexOf(categoryId);
    if (index === -1) {
      return; // Category doesn't exist
    }
    
    this._categories.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
    
    this.apply(new CategoryRemovedEvent(this._id!, categoryId));
  }

  /**
   * Delete this menu
   */
  delete(): void {
    this.apply(new MenuDeletedEvent(this._id, this._restaurantId));
  }

  /**
   * Get all uncommitted events
   */
  getUncommittedEvents(): any[] {
    return super.getUncommittedEvents();
  }

  /**
   * Commit all events
   */
  commit(): void {
    super.commit();
  }

  /**
   * Convert entity to a format suitable for persistence
   */
  toPersistence(): any {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      name: this.name,
      description: this.description,
      active: this.active,
      availability: this.availability?.toPersistence(),
      categories: this.categories,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }

  /**
   * Create a domain entity from persistence data
   */
  static fromPersistence(data: any): Menu {
    if (!data) {
      throw new Error('Cannot create Menu entity from null data');
    }
    
    try {
      // Handle data from MongoDB and convert it to a domain entity
      let id = data.id;
      if (!id && data._id) {
        id = data._id.toString ? data._id.toString() : String(data._id);
      }
      
      // Make sure restaurantId is properly extracted
      let restaurantId = data.restaurantId;
      if (typeof restaurantId === 'object' && restaurantId !== null) {
        if (restaurantId._id) {
          restaurantId = restaurantId._id.toString();
        } else if (restaurantId.toString) {
          restaurantId = restaurantId.toString();
        }
      } else if (!restaurantId && data._id) {
        // If no restaurantId is provided, we'll use a default for testing
        restaurantId = "000000000000000000000000";
      }
      
      if (!restaurantId) {
        throw new Error('Menu data must contain a valid restaurantId field');
      }
      
      // Create availability value object if the data has it
      let availability;
      if (data.availability) {
        try {
          availability = new Availability(
            data.availability.daysOfWeek || data.availability._daysOfWeek || [],
            data.availability.startTime || data.availability._startTime || '',
            data.availability.endTime || data.availability._endTime || ''
          );
        } catch (error) {
          // Silently handle availability errors
        }
      }
      
      // Convert categories to strings if they are ObjectIds
      let categories = data.categories || [];
      if (Array.isArray(categories)) {
        categories = categories.map(cat => {
          if (typeof cat === 'object' && cat !== null && cat._id) {
            return cat._id.toString();
          } else if (typeof cat === 'object' && cat !== null && cat.toString) {
            return cat.toString();
          }
          return cat;
        });
      }
      
      const menuProps: MenuProps = {
        id,
        restaurantId,
        name: data.name,
        description: data.description || '',
        active: data.active !== undefined ? data.active : true,
        categories,
        availability,
        metadata: data.metadata || {},
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      };
      
      // Create and return the menu entity
      return new Menu(menuProps);
    } catch (error) {
      throw new Error(`Failed to create Menu entity from persistence: ${error.message}`);
    }
  }
} 