import { AggregateRoot } from '@nestjs/cqrs';
import { MenuItemCreatedEvent } from '../events/menu-item/menu-item-created.event';
import { MenuItemUpdatedEvent } from '../events/menu-item/menu-item-updated.event';
import { DietaryInfo } from '../value-objects/dietary-info.value-object';
import { OptionType } from '../../schemas/menu-item/menu-item.schema';

export interface MenuItemProps {
  id?: string;
  categoryId: string;
  name: string;
  description?: string;
  images?: string[];
  price: number;
  discountedPrice?: number;
  currency?: string;
  preparationTime?: number;
  calories?: number;
  spicyLevel?: number;
  available?: boolean;
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    nutFree?: boolean;
  };
  ingredients?: string[];
  options?: OptionType[];
  featured?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
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
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    nutFree?: boolean;
  };
  private _ingredients: string[] = [];
  private _options: OptionType[] = [];
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
    this._images = props.images || [];
    this._price = props.price;
    this._discountedPrice = props.discountedPrice;
    this._currency = props.currency || 'USD';
    this._preparationTime = props.preparationTime;
    this._calories = props.calories;
    this._spicyLevel = props.spicyLevel;
    this._available = props.available !== undefined ? props.available : true;
    this._dietary = props.dietary;
    this._ingredients = props.ingredients || [];
    this._options = props.options || [];
    this._featured = props.featured !== undefined ? props.featured : false;
    this._tags = props.tags || [];
    this._metadata = props.metadata;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._version = props.version || 0;

    // If this is a new menu item (no ID yet), apply creation event
    if (!props.id) {
      this.apply(new MenuItemCreatedEvent(this));
    }
  }

  // Static factory method to create a new MenuItem
  public static create(props: MenuItemProps): MenuItem {
    const menuItem = new MenuItem(props);
    return menuItem;
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

  get dietary(): { vegetarian?: boolean; vegan?: boolean; glutenFree?: boolean; dairyFree?: boolean; nutFree?: boolean; } | undefined {
    return this._dietary ? { ...this._dietary } : undefined;
  }

  get ingredients(): string[] {
    return [...this._ingredients]; // Return a copy to prevent direct modification
  }

  get options(): OptionType[] {
    return this._options.map(option => ({...option})); // Return a deep copy
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

  // Business methods
  public updateName(name: string): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      name,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { name }));
    return updatedItem;
  }

  public updateDescription(description: string): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      description,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { description }));
    return updatedItem;
  }

  public updatePrice(price: number): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      price,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { price }));
    return updatedItem;
  }

  public updateDiscountedPrice(discountedPrice: number | undefined): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      discountedPrice,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { discountedPrice }));
    return updatedItem;
  }

  public updateAvailability(available: boolean): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      available,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { available }));
    return updatedItem;
  }

  public updateFeatured(featured: boolean): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      featured,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { featured }));
    return updatedItem;
  }

  public updateIngredients(ingredients: string[]): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      ingredients,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { ingredients }));
    return updatedItem;
  }

  public updateOptions(options: OptionType[]): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      options,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { options }));
    return updatedItem;
  }

  public addOption(option: OptionType): MenuItem {
    const updatedOptions = [...this._options, option];
    
    const updatedItem = new MenuItem({
      ...this.toObject(),
      options: updatedOptions,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { options: updatedOptions }));
    return updatedItem;
  }

  public updateOption(optionIndex: number, option: OptionType): MenuItem {
    if (optionIndex < 0 || optionIndex >= this._options.length) {
      throw new Error(`Option at index ${optionIndex} not found`);
    }
    
    const updatedOptions = [...this._options];
    updatedOptions[optionIndex] = option;
    
    const updatedItem = new MenuItem({
      ...this.toObject(),
      options: updatedOptions,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { options: updatedOptions }));
    return updatedItem;
  }

  public removeOption(optionIndex: number): MenuItem {
    if (optionIndex < 0 || optionIndex >= this._options.length) {
      throw new Error(`Option at index ${optionIndex} not found`);
    }
    
    const updatedOptions = [...this._options];
    updatedOptions.splice(optionIndex, 1);
    
    const updatedItem = new MenuItem({
      ...this.toObject(),
      options: updatedOptions,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { options: updatedOptions }));
    return updatedItem;
  }

  public updateTags(tags: string[]): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      tags,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { tags }));
    return updatedItem;
  }

  public updateDietary(dietary: { vegetarian?: boolean; vegan?: boolean; glutenFree?: boolean; dairyFree?: boolean; nutFree?: boolean; }): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      dietary,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { dietary }));
    return updatedItem;
  }

  public updateImages(images: string[]): MenuItem {
    const updatedItem = new MenuItem({
      ...this.toObject(),
      images,
      updatedAt: new Date()
    });
    
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, { images }));
    return updatedItem;
  }

  /**
   * Update multiple details of the menu item at once
   * @param updates Object containing the properties to update
   * @returns Updated MenuItem entity
   */
  public updateDetails(updates: Partial<MenuItemProps>): MenuItem {
    const currentProps = this.toObject();
    
    // Create a new props object with updates applied
    const updatedProps = {
      ...currentProps,
      ...updates,
      updatedAt: new Date()
    };
    
    // Create a new MenuItem with the updated properties
    const updatedItem = new MenuItem(updatedProps);
    
    // Apply the update event
    updatedItem.apply(new MenuItemUpdatedEvent(updatedItem.id, updates));
    
    return updatedItem;
  }

  // Helper method to convert entity to plain object
  toObject(): MenuItemProps {
    return {
      id: this._id,
      categoryId: this._categoryId,
      name: this._name,
      description: this._description,
      images: [...this._images],
      price: this._price,
      discountedPrice: this._discountedPrice,
      currency: this._currency,
      preparationTime: this._preparationTime,
      calories: this._calories,
      spicyLevel: this._spicyLevel,
      dietary: this._dietary ? { ...this._dietary } : undefined,
      ingredients: [...this._ingredients],
      options: this._options.map(option => ({...option})),
      available: this._available,
      featured: this._featured,
      tags: [...this._tags],
      metadata: this._metadata ? { ...this._metadata } : undefined,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version
    };
  }

  // Method to reconstruct a MenuItem entity from persistence
  public static fromPersistence(data: any): MenuItem {
    // Make sure we have an ID from the database
    const id = data._id ? 
      (typeof data._id === 'object' ? data._id.toString() : data._id.toString()) : 
      (data.id ? data.id.toString() : undefined);
    
    if (!id) {
      throw new Error('Missing ID in persistence data for MenuItem');
    }
    
    // Make sure we have a categoryId
    const categoryId = data.categoryId ? 
      (typeof data.categoryId === 'object' ? data.categoryId.toString() : data.categoryId.toString()) : 
      '';
    
    if (!categoryId) {
      console.warn(`MenuItem ${id} has no categoryId`);
    }
    
    const menuItem = new MenuItem({
      id,
      categoryId,
      name: data.name || 'Unnamed Item',
      price: typeof data.price === 'number' ? data.price : 0,
      description: data.description,
      discountedPrice: data.discountedPrice,
      available: data.available !== undefined ? data.available : true,
      dietary: data.dietary ? {
        vegetarian: Boolean(data.dietary.vegetarian),
        vegan: Boolean(data.dietary.vegan),
        glutenFree: Boolean(data.dietary.glutenFree),
        nutFree: Boolean(data.dietary.nutFree),
      } : undefined,
    });
    
    // Set the properties that aren't part of the constructor
    if (data.images && Array.isArray(data.images)) {
      menuItem._images = [...data.images.map((image: any) => image.toString())];
    }
    
    if (data.ingredients && Array.isArray(data.ingredients)) {
      menuItem._ingredients = [...data.ingredients.map((ingredient: any) => ingredient.toString())];
    }
    
    if (data.options && Array.isArray(data.options)) {
      menuItem._options = [...data.options.map((option: any) => option as OptionType)];
    }
    
    if (data.tags && Array.isArray(data.tags)) {
      menuItem._tags = [...data.tags.map((tag: any) => tag.toString())];
    }
    
    menuItem._currency = data.currency || 'USD';
    menuItem._preparationTime = data.preparationTime;
    menuItem._calories = data.calories;
    menuItem._spicyLevel = data.spicyLevel;
    menuItem._featured = data.featured === true;
    menuItem._metadata = data.metadata || {};
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
      description: this._description || '',
      images: Array.isArray(this._images) ? this._images : [],
      price: this._price,
      discountedPrice: this._discountedPrice,
      currency: this._currency || 'USD',
      preparationTime: this._preparationTime,
      calories: this._calories,
      spicyLevel: this._spicyLevel,
      dietary: this._dietary || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        nutFree: false
      },
      ingredients: Array.isArray(this._ingredients) ? this._ingredients : [],
      options: Array.isArray(this._options) ? this._options : [],
      available: this._available !== undefined ? this._available : true,
      featured: this._featured !== undefined ? this._featured : false,
      tags: Array.isArray(this._tags) ? this._tags : [],
      metadata: this._metadata || {},
      createdAt: this._createdAt || new Date(),
      updatedAt: this._updatedAt || new Date(),
      version: this._version || 0,
    };
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
}