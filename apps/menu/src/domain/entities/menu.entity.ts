import { AggregateRoot } from '@nestjs/cqrs';
import { CategoryAddedEvent } from '../events/category/category-added.event';
import { CategoryRemovedEvent } from '../events/category/category-removed.event';
import { MenuCreatedEvent } from '../events/menu/menu-created.event';
import { Availability } from '../value-objects/availability.value-object';

export interface MenuProps {
  id?: string;
  restaurantId: string;
  name: string;
  description?: string;
  active?: boolean;
  availability?: Availability;
  metadata?: Record<string, any>;
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
    this._categories = [];
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._version = 0;

    this.apply(new MenuCreatedEvent(this));
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

  // Method to reconstruct a Menu entity from persistence
  public static fromPersistence(data: any): Menu {
    const menu = new Menu({
      id: data._id.toString(),
      restaurantId: data.restaurantId.toString(),
      name: data.name,
      description: data.description,
      active: data.active,
      availability: data.availability ? Availability.fromPersistence(data.availability) : undefined,
      metadata: data.metadata,
    });
    
    // Set the properties that aren't part of the constructor
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach((categoryId: any) => {
        menu._categories.push(categoryId.toString());
      });
    }
    
    menu._createdAt = data.createdAt || new Date();
    menu._updatedAt = data.updatedAt || new Date();
    menu._version = data.version || 0;
    
    return menu;
  }

  // Method to convert to persistence format
  public toPersistence(): any {
    const persistenceData: any = {
      restaurantId: this._restaurantId,
      name: this._name,
      description: this._description,
      active: this._active,
      availability: this._availability?.toPersistence(),
      categories: this._categories,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version,
    };

    if (this._id) {
      persistenceData._id = this._id;
    }

    return persistenceData;
  }
} 