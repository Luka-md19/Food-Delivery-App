import { AggregateRoot } from '@nestjs/cqrs';
import { CategoryCreatedEvent } from '../events/category-created.event';
import { CategoryItemAddedEvent } from '../events/category-item-added.event';
import { CategoryItemRemovedEvent } from '../events/category-item-removed.event';

export interface CategoryProps {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  image?: string;
  displayOrder?: number;
  active?: boolean;
  parentCategoryId?: string;
  metadata?: Record<string, any>;
}

export class Category extends AggregateRoot {
  private readonly _id: string;
  private readonly _menuId: string;
  private _name: string;
  private _description?: string;
  private _image?: string;
  private _displayOrder: number;
  private _active: boolean;
  private _items: string[] = [];
  private _parentCategoryId?: string;
  private _metadata?: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;

  constructor(props: CategoryProps) {
    super();
    this._id = props.id;
    this._menuId = props.menuId;
    this._name = props.name;
    this._description = props.description;
    this._image = props.image;
    this._displayOrder = props.displayOrder ?? 0;
    this._active = props.active ?? true;
    this._parentCategoryId = props.parentCategoryId;
    this._metadata = props.metadata;
    this._items = [];
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._version = 0;

    this.apply(new CategoryCreatedEvent(this));
  }

  // Factory method to create a new category
  public static create(props: CategoryProps): Category {
    return new Category(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get menuId(): string {
    return this._menuId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get image(): string | undefined {
    return this._image;
  }

  get displayOrder(): number {
    return this._displayOrder;
  }

  get active(): boolean {
    return this._active;
  }

  get items(): string[] {
    return [...this._items]; // Return a copy to prevent direct modification
  }

  get parentCategoryId(): string | undefined {
    return this._parentCategoryId;
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
  public updateDetails(updates: Partial<Omit<CategoryProps, 'id' | 'menuId'>>): void {
    let changed = false;

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      changed = true;
    }
    
    if (updates.description !== undefined && updates.description !== this._description) {
      this._description = updates.description;
      changed = true;
    }
    
    if (updates.image !== undefined && updates.image !== this._image) {
      this._image = updates.image;
      changed = true;
    }
    
    if (updates.displayOrder !== undefined && updates.displayOrder !== this._displayOrder) {
      this._displayOrder = updates.displayOrder;
      changed = true;
    }
    
    if (updates.active !== undefined && updates.active !== this._active) {
      this._active = updates.active;
      changed = true;
    }
    
    if (updates.parentCategoryId !== undefined && updates.parentCategoryId !== this._parentCategoryId) {
      this._parentCategoryId = updates.parentCategoryId;
      changed = true;
    }
    
    if (updates.metadata !== undefined) {
      this._metadata = updates.metadata;
      changed = true;
    }
    
    if (changed) {
      this._updatedAt = new Date();
      this._version += 1;
    }
  }

  public addItem(itemId: string): void {
    if (this._items.includes(itemId)) {
      return; // Item already exists
    }
    
    this._items.push(itemId);
    this._updatedAt = new Date();
    this._version += 1;
    
    this.apply(new CategoryItemAddedEvent(this.id, itemId));
  }

  public removeItem(itemId: string): void {
    const index = this._items.indexOf(itemId);
    if (index === -1) {
      return; // Item doesn't exist
    }
    
    this._items.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
    
    this.apply(new CategoryItemRemovedEvent(this.id, itemId));
  }

  // Method to reconstruct a Category entity from persistence
  public static fromPersistence(data: any): Category {
    const category = new Category({
      id: data._id.toString(),
      menuId: data.menuId.toString(),
      name: data.name,
      description: data.description,
      image: data.image,
      displayOrder: data.displayOrder,
      active: data.active,
      parentCategoryId: data.parentCategoryId ? data.parentCategoryId.toString() : undefined,
      metadata: data.metadata,
    });
    
    // Set the properties that aren't part of the constructor
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((itemId: any) => {
        category._items.push(itemId.toString());
      });
    }
    
    category._createdAt = data.createdAt || new Date();
    category._updatedAt = data.updatedAt || new Date();
    category._version = data.version || 0;
    
    return category;
  }

  // Method to convert to persistence format
  public toPersistence(): any {
    return {
      _id: this._id,
      menuId: this._menuId,
      name: this._name,
      description: this._description,
      image: this._image,
      displayOrder: this._displayOrder,
      active: this._active,
      items: this._items,
      parentCategoryId: this._parentCategoryId,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version,
    };
  }
}