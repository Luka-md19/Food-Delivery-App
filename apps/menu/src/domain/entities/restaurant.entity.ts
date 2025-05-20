import { AggregateRoot } from '@nestjs/cqrs';
import { RestaurantCreatedEvent } from '../events/restaurant/restaurant-created.event';
import { RestaurantUpdatedEvent } from '../events/restaurant/restaurant-updated.event';
import { RestaurantDeletedEvent } from '../events/restaurant/restaurant-deleted.event';

export interface RestaurantProps {
  id?: string;
  name: string;
  description?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: {
    dayOfWeek: number; // 0-6, 0 = Sunday
    open: string; // HH:MM format
    close: string; // HH:MM format
  }[];
  active?: boolean;
  cuisineTypes?: string[];
  tags?: string[];
  priceRange?: number; // 1-4, representing $ to $$$$
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Restaurant extends AggregateRoot {
  private _id?: string;
  private _name: string;
  private _description?: string;
  private _address?: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };
  private _phone?: string;
  private _email?: string;
  private _website?: string;
  private _openingHours?: {
    dayOfWeek: number;
    open: string;
    close: string;
  }[];
  private _active: boolean;
  private _cuisineTypes: string[] = [];
  private _tags: string[] = [];
  private _priceRange?: number;
  private _metadata?: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;

  constructor(props: RestaurantProps) {
    super();
    this._id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._address = props.address;
    this._phone = props.phone;
    this._email = props.email;
    this._website = props.website;
    this._openingHours = props.openingHours;
    this._active = props.active ?? true;
    this._cuisineTypes = props.cuisineTypes || [];
    this._tags = props.tags || [];
    this._priceRange = props.priceRange;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._version = 0;

    // Only apply the event if this is a new restaurant (no ID yet)
    if (!props.id) {
      this.apply(new RestaurantCreatedEvent(this.toRestaurantProps()));
    }
  }

  // Factory method to create a new restaurant
  public static create(props: RestaurantProps): Restaurant {
    return new Restaurant(props);
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get address(): { street: string; city: string; state?: string; zipCode: string; country: string } | undefined {
    return this._address ? { ...this._address } : undefined;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get email(): string | undefined {
    return this._email;
  }

  get website(): string | undefined {
    return this._website;
  }

  get openingHours(): { dayOfWeek: number; open: string; close: string }[] | undefined {
    return this._openingHours ? [...this._openingHours] : undefined;
  }

  get active(): boolean {
    return this._active;
  }

  get cuisineTypes(): string[] {
    return [...this._cuisineTypes];
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get priceRange(): number | undefined {
    return this._priceRange;
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

  // Helper method to convert this entity to props for events
  private toRestaurantProps(): RestaurantProps {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      address: this._address,
      phone: this._phone,
      email: this._email,
      website: this._website,
      openingHours: this._openingHours,
      active: this._active,
      cuisineTypes: this._cuisineTypes,
      tags: this._tags,
      priceRange: this._priceRange,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * Convert entity to plain object for storage
   * @returns Plain object representation of the entity
   */
  public toObject(): Record<string, any> {
    return {
      _id: this._id,
      name: this._name,
      description: this._description,
      address: this._address,
      phone: this._phone,
      email: this._email,
      website: this._website,
      openingHours: this._openingHours,
      active: this._active,
      cuisineTypes: this._cuisineTypes,
      tags: this._tags,
      priceRange: this._priceRange,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version
    };
  }

  // Business methods
  public update(updates: Partial<Omit<RestaurantProps, 'id'>>): void {
    this.updateDetails(updates);
  }
  
  public updateDetails(updates: Partial<Omit<RestaurantProps, 'id'>>): void {
    let modified = false;
    
    if (updates.name !== undefined && this._name !== updates.name) {
      this._name = updates.name;
      modified = true;
    }
    
    if (updates.description !== undefined && this._description !== updates.description) {
      this._description = updates.description;
      modified = true;
    }
    
    if (updates.address !== undefined) {
      this._address = updates.address;
      modified = true;
    }
    
    if (updates.phone !== undefined && this._phone !== updates.phone) {
      this._phone = updates.phone;
      modified = true;
    }
    
    if (updates.email !== undefined && this._email !== updates.email) {
      this._email = updates.email;
      modified = true;
    }
    
    if (updates.website !== undefined && this._website !== updates.website) {
      this._website = updates.website;
      modified = true;
    }
    
    if (updates.openingHours !== undefined) {
      this._openingHours = updates.openingHours;
      modified = true;
    }
    
    if (updates.active !== undefined && this._active !== updates.active) {
      this._active = updates.active;
      modified = true;
    }
    
    if (updates.cuisineTypes !== undefined) {
      this._cuisineTypes = [...updates.cuisineTypes];
      modified = true;
    }
    
    if (updates.tags !== undefined) {
      this._tags = [...updates.tags];
      modified = true;
    }
    
    if (updates.priceRange !== undefined && this._priceRange !== updates.priceRange) {
      this._priceRange = updates.priceRange;
      modified = true;
    }
    
    if (updates.metadata !== undefined) {
      this._metadata = updates.metadata;
      modified = true;
    }
    
    if (modified) {
      this._updatedAt = new Date();
      this._version += 1;
      
      // Apply the updated event
      if (this._id) {
        this.apply(new RestaurantUpdatedEvent(this.toRestaurantProps()));
      }
    }
  }

  /**
   * Add a cuisine type to the restaurant
   * @param cuisineType The cuisine type to add
   */
  public addCuisineType(cuisineType: string): void {
    if (!cuisineType || this._cuisineTypes.includes(cuisineType)) {
      return;
    }
    
    this._cuisineTypes.push(cuisineType);
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new RestaurantUpdatedEvent(this.toRestaurantProps()));
    }
  }

  /**
   * Remove a cuisine type from the restaurant
   * @param cuisineType The cuisine type to remove
   */
  public removeCuisineType(cuisineType: string): void {
    const index = this._cuisineTypes.indexOf(cuisineType);
    if (index === -1) {
      return;
    }
    
    this._cuisineTypes.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new RestaurantUpdatedEvent(this.toRestaurantProps()));
    }
  }

  /**
   * Add a tag to the restaurant
   * @param tag The tag to add
   */
  public addTag(tag: string): void {
    if (!tag || this._tags.includes(tag)) {
      return;
    }
    
    this._tags.push(tag);
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new RestaurantUpdatedEvent(this.toRestaurantProps()));
    }
  }

  /**
   * Remove a tag from the restaurant
   * @param tag The tag to remove
   */
  public removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index === -1) {
      return;
    }
    
    this._tags.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
    
    if (this._id) {
      this.apply(new RestaurantUpdatedEvent(this.toRestaurantProps()));
    }
  }

  /**
   * Mark the restaurant as deleted
   */
  public markAsDeleted(): void {
    this.delete();
  }

  /**
   * Mark the restaurant as deleted
   */
  public delete(): void {
    if (this._id) {
      this.apply(new RestaurantDeletedEvent({ id: this._id }));
    }
  }

  /**
   * Get all uncommitted events from the aggregate root
   */
  getUncommittedEvents(): any[] {
    return super.getUncommittedEvents();
  }

  /**
   * Commit all events in the aggregate root
   */
  commit(): void {
    super.commit();
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): any {
    return this.toObject();
  }

  /**
   * Create an entity from persistence data
   */
  static fromPersistence(data: any): Restaurant {
    return new Restaurant({
      id: data._id ? data._id.toString() : data.id,
      name: data.name,
      description: data.description,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      openingHours: data.openingHours,
      active: data.active,
      cuisineTypes: data.cuisineTypes || [],
      tags: data.tags || [],
      priceRange: data.priceRange,
      metadata: data.metadata,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    });
  }
} 