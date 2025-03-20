import { AggregateRoot } from '@nestjs/cqrs';
import { MenuItemCreatedEvent } from '../events/menu-item/menu-item-created.event';
import { MenuItemUpdatedEvent } from '../events/menu-item/menu-item-updated.event';
import { DietaryInfo } from '../value-objects/dietary-info.value-object';

export interface MenuItemProps {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  available: boolean;
  dietary?: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    nutFree: boolean;
  };
}

export class MenuItem extends AggregateRoot {
  private readonly _id: string;
  private readonly _categoryId: string;
  private _name: string;
  private _description?: string;
  private _images: string[] = [];
  private _price: number;
  private _discountedPrice?: number;
  private _currency: string;
  private _preparationTime?: number;
  private _calories?: number;
  private _spicyLevel?: number;
  private _dietary?: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    nutFree: boolean;
  };
  private _ingredients: string[] = [];
  private _options: string[] = [];
  private _available: boolean;
  private _featured: boolean;
  private _tags: string[] = [];
  private _metadata?: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;

  constructor(props: MenuItemProps) {
    super();
    this._id = props.id;
    this._categoryId = props.categoryId;
    this._name = props.name;
    this._description = props.description;
    this._price = props.price;
    this._discountedPrice = props.discountedPrice;
    this._available = props.available;
    this._dietary = props.dietary;
    this._images = [];
    this._currency = 'USD';
    this._preparationTime = undefined;
    this._calories = undefined;
    this._spicyLevel = undefined;
    this._ingredients = [];
    this._options = [];
    this._featured = false;
    this._tags = [];
    this._metadata = undefined;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._version = 0;

    this.apply(new MenuItemCreatedEvent(this));
  }

  // Factory method to create a new menu item
  public static create(props: MenuItemProps): MenuItem {
    return new MenuItem(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get categoryId(): string {
    return this._categoryId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get images(): string[] {
    return [...this._images]; // Return a copy to prevent direct modification
  }

  get price(): number {
    return this._price;
  }

  get discountedPrice(): number | undefined {
    return this._discountedPrice;
  }

  get currency(): string {
    return this._currency;
  }

  get preparationTime(): number | undefined {
    return this._preparationTime;
  }

  get calories(): number | undefined {
    return this._calories;
  }

  get spicyLevel(): number | undefined {
    return this._spicyLevel;
  }

  get dietary(): { vegetarian: boolean; vegan: boolean; glutenFree: boolean; nutFree: boolean } | undefined {
    return this._dietary;
  }

  get ingredients(): string[] {
    return [...this._ingredients]; // Return a copy to prevent direct modification
  }

  get options(): string[] {
    return [...this._options]; // Return a copy to prevent direct modification
  }

  get available(): boolean {
    return this._available;
  }

  get featured(): boolean {
    return this._featured;
  }

  get tags(): string[] {
    return [...this._tags]; // Return a copy to prevent direct modification
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

  // Setters - for immutability, these return new instances
  setName(name: string): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      name,
    });
  }

  setDescription(description: string): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      description,
    });
  }

  setPrice(price: number): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      price,
    });
  }

  setDiscountedPrice(discountedPrice: number | undefined): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      discountedPrice,
    });
  }

  setAvailable(available: boolean): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      available,
    });
  }

  setDietary(dietary: { vegetarian: boolean; vegan: boolean; glutenFree: boolean; nutFree: boolean } | undefined): MenuItem {
    return new MenuItem({
      ...this.toObject(),
      dietary,
    });
  }

  // Helper method to convert to plain object
  toObject(): MenuItemProps {
    return {
      id: this._id,
      categoryId: this._categoryId,
      name: this._name,
      description: this._description,
      price: this._price,
      discountedPrice: this._discountedPrice,
      available: this._available,
      dietary: this._dietary,
    };
  }

  // Business methods
  public updateDetails(updates: Partial<Omit<MenuItemProps, 'id' | 'categoryId'>>): void {
    let changed = false;

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      changed = true;
    }
    
    if (updates.description !== undefined && updates.description !== this._description) {
      this._description = updates.description;
      changed = true;
    }
    
    if (updates.price !== undefined && updates.price !== this._price) {
      this._price = updates.price;
      changed = true;
    }
    
    if (updates.discountedPrice !== undefined && updates.discountedPrice !== this._discountedPrice) {
      this._discountedPrice = updates.discountedPrice;
      changed = true;
    }
    
    if (updates.available !== undefined && updates.available !== this._available) {
      this._available = updates.available;
      changed = true;
    }
    
    if (updates.dietary !== undefined) {
      this._dietary = updates.dietary;
      changed = true;
    }
    
    // Handle other properties that aren't in MenuItemProps but are in the entity
    if (arguments[0]) {
      const additionalUpdates = arguments[0] as any;
      
      if (additionalUpdates.currency !== undefined && additionalUpdates.currency !== this._currency) {
        this._currency = additionalUpdates.currency;
        changed = true;
      }
      
      if (additionalUpdates.preparationTime !== undefined && additionalUpdates.preparationTime !== this._preparationTime) {
        this._preparationTime = additionalUpdates.preparationTime;
        changed = true;
      }
      
      if (additionalUpdates.calories !== undefined && additionalUpdates.calories !== this._calories) {
        this._calories = additionalUpdates.calories;
        changed = true;
      }
      
      if (additionalUpdates.spicyLevel !== undefined && additionalUpdates.spicyLevel !== this._spicyLevel) {
        this._spicyLevel = additionalUpdates.spicyLevel;
        changed = true;
      }
      
      if (additionalUpdates.featured !== undefined && additionalUpdates.featured !== this._featured) {
        this._featured = additionalUpdates.featured;
        changed = true;
      }
      
      if (additionalUpdates.metadata !== undefined) {
        this._metadata = additionalUpdates.metadata;
        changed = true;
      }
    }
    
    if (changed) {
      this._updatedAt = new Date();
      this._version += 1;
      this.apply(new MenuItemUpdatedEvent(this.id, this._categoryId));
    }
  }

  public updateImages(images: string[]): void {
    this._images = [...images];
    this._updatedAt = new Date();
    this._version += 1;
  }

  public updateTags(tags: string[]): void {
    this._tags = [...tags];
    this._updatedAt = new Date();
    this._version += 1;
  }

  public addIngredient(ingredientId: string): void {
    if (this._ingredients.includes(ingredientId)) {
      return; // Ingredient already exists
    }
    
    this._ingredients.push(ingredientId);
    this._updatedAt = new Date();
    this._version += 1;
  }

  public removeIngredient(ingredientId: string): void {
    const index = this._ingredients.indexOf(ingredientId);
    if (index === -1) {
      return; // Ingredient doesn't exist
    }
    
    this._ingredients.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
  }

  public addOption(optionId: string): void {
    if (this._options.includes(optionId)) {
      return; // Option already exists
    }
    
    this._options.push(optionId);
    this._updatedAt = new Date();
    this._version += 1;
  }

  public removeOption(optionId: string): void {
    const index = this._options.indexOf(optionId);
    if (index === -1) {
      return; // Option doesn't exist
    }
    
    this._options.splice(index, 1);
    this._updatedAt = new Date();
    this._version += 1;
  }

  // Method to reconstruct a MenuItem entity from persistence
  public static fromPersistence(data: any): MenuItem {
    const menuItem = new MenuItem({
      id: data._id.toString(),
      categoryId: data.categoryId.toString(),
      name: data.name,
      price: data.price,
      description: data.description,
      discountedPrice: data.discountedPrice,
      available: data.available !== undefined ? data.available : true,
      dietary: data.dietary ? {
        vegetarian: data.dietary.vegetarian,
        vegan: data.dietary.vegan,
        glutenFree: data.dietary.glutenFree,
        nutFree: data.dietary.nutFree,
      } : undefined,
    });
    
    // Set the properties that aren't part of the constructor
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach((image: any) => {
        menuItem._images.push(image.toString());
      });
    }
    
    if (data.ingredients && Array.isArray(data.ingredients)) {
      data.ingredients.forEach((ingredientId: any) => {
        menuItem._ingredients.push(ingredientId.toString());
      });
    }
    
    if (data.options && Array.isArray(data.options)) {
      data.options.forEach((optionId: any) => {
        menuItem._options.push(optionId.toString());
      });
    }
    
    menuItem._createdAt = data.createdAt || new Date();
    menuItem._updatedAt = data.updatedAt || new Date();
    menuItem._version = data.version || 0;
    
    return menuItem;
  }

  // Method to convert to persistence format
  public toPersistence(): any {
    return {
      _id: this._id,
      categoryId: this._categoryId,
      name: this._name,
      description: this._description,
      images: this._images,
      price: this._price,
      discountedPrice: this._discountedPrice,
      currency: this._currency,
      preparationTime: this._preparationTime,
      calories: this._calories,
      spicyLevel: this._spicyLevel,
      dietary: this._dietary,
      ingredients: this._ingredients,
      options: this._options,
      available: this._available,
      featured: this._featured,
      tags: this._tags,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version,
    };
  }
}