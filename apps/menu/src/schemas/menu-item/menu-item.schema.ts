import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MenuItemDocument = MenuItem & Document;

// Nested option value schema
@Schema({ _id: false })
export class OptionValue {
  @ApiProperty({ description: 'Option value name', example: 'Small' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Additional price for this option', example: 2.00 })
  @Prop({ required: true, default: 0 })
  price: number;

  @ApiPropertyOptional({ description: 'Whether this option value is available', example: true })
  @Prop({ default: true })
  available: boolean;

  @ApiPropertyOptional({ description: 'Description of this option value', example: '12 inch diameter' })
  @Prop()
  description?: string;

  @ApiPropertyOptional({ description: 'External ID for integrations', example: 'POS-123' })
  @Prop()
  externalId?: string;
}

export const OptionValueSchema = SchemaFactory.createForClass(OptionValue);

// Nested option type schema
@Schema({ _id: false })
export class OptionType {
  @ApiProperty({ description: 'Option group name', example: 'Size' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ description: 'Option group description', example: 'Choose your pizza size' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Whether selecting an option is required', example: true })
  @Prop({ default: false })
  required: boolean;

  @ApiProperty({ description: 'Whether multiple options can be selected', example: false })
  @Prop({ default: false })
  multiple: boolean;

  @ApiPropertyOptional({ description: 'Minimum selections required (if multiple)', example: 1 })
  @Prop({ min: 0 })
  minSelections?: number;

  @ApiPropertyOptional({ description: 'Maximum selections allowed (if multiple)', example: 3 })
  @Prop({ min: 0 })
  maxSelections?: number;

  @ApiProperty({ description: 'Available option values', type: [OptionValue] })
  @Prop({ type: [OptionValueSchema], default: [] })
  values: OptionValue[];

  @ApiPropertyOptional({ description: 'Display order for this option group', example: 1 })
  @Prop({ default: 0 })
  displayOrder?: number;

  @ApiProperty({ description: 'Unique identifier for this option type', example: 'size-option' })
  @Prop()
  id?: string;
}

export const OptionTypeSchema = SchemaFactory.createForClass(OptionType);

@Schema({
  timestamps: true,
  collection: 'menuItems',
  versionKey: 'version',
})
export class MenuItem {
  @ApiProperty({ description: 'Category ID', example: '60d21b4667d0d8992e610c85' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    required: true,
    index: true 
  })
  categoryId: string;

  @ApiProperty({ description: 'Item name', example: 'Margherita Pizza' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ description: 'Item description', example: 'Classic pizza with tomato sauce, mozzarella, and basil' })
  @Prop()
  description?: string;

  @ApiPropertyOptional({ description: 'Item images', example: ['https://example.com/images/pizza1.jpg'] })
  @Prop({ type: [String], default: [] })
  images?: string[];

  @ApiProperty({ description: 'Item price', example: 12.99 })
  @Prop({ required: true })
  price: number;

  @ApiPropertyOptional({ description: 'Discounted price if on sale', example: 10.99 })
  @Prop()
  discountedPrice?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15 })
  @Prop()
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calories per serving', example: 850 })
  @Prop()
  calories?: number;

  @ApiPropertyOptional({ description: 'Spicy level (0-5)', example: 2 })
  @Prop({ min: 0, max: 5 })
  spicyLevel?: number;

  @ApiPropertyOptional({ 
    description: 'Dietary information',
    example: {
      vegetarian: true,
      vegan: false,
      glutenFree: false
    }
  })
  @Prop({
    type: {
      vegetarian: Boolean,
      vegan: Boolean,
      glutenFree: Boolean,
      dairyFree: Boolean,
      nutFree: Boolean
    }
  })
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    nutFree?: boolean;
  };

  @ApiPropertyOptional({ description: 'Item ingredients', example: ['Dough', 'Tomato Sauce', 'Mozzarella', 'Basil'] })
  @Prop({ type: [String], default: [] })
  ingredients?: string[];

  @ApiPropertyOptional({ 
    description: 'Item customization options',
    type: [OptionType]
  })
  @Prop({ type: [OptionTypeSchema], default: [] })
  options?: OptionType[];

  @ApiProperty({ description: 'Whether the item is available', example: true })
  @Prop({ default: true })
  available: boolean;

  @ApiProperty({ description: 'Whether item is featured', example: false })
  @Prop({ default: false })
  featured: boolean;

  @ApiPropertyOptional({ description: 'Item tags', example: ['pizza', 'italian', 'bestseller'] })
  @Prop({ type: [String], default: [] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: 0 })
  version: number;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// Add indexes for common query patterns
MenuItemSchema.index({ categoryId: 1, available: 1 });
MenuItemSchema.index({ categoryId: 1, price: 1 });
MenuItemSchema.index({ featured: 1 });
MenuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Add compound indexes for better query performance
MenuItemSchema.index({ categoryId: 1, available: 1, price: 1 });
MenuItemSchema.index({ categoryId: 1, available: 1, featured: 1 });
MenuItemSchema.index({ categoryId: 1, available: 1, name: 1 });
MenuItemSchema.index({ categoryId: 1, available: 1, displayOrder: 1 });

// Add partial index for active items
MenuItemSchema.index({ available: 1 }, { partialFilterExpression: { available: true } });

// Add text index for search functionality
MenuItemSchema.index(
  { 
    name: 'text', 
    description: 'text',
    ingredients: 'text',
    tags: 'text'
  }, 
  {
    weights: {
      name: 10,
      description: 5,
      ingredients: 3,
      tags: 4
    },
    name: 'menu_items_text_index'
  }
); 