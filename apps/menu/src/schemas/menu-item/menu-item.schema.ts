import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MenuItemDocument = MenuItem & Document;

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
    example: [
      {
        name: 'Size',
        required: true,
        multiple: false,
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 2 },
          { name: 'Large', price: 4 }
        ]
      }
    ]
  })
  @Prop([{
    name: String,
    required: Boolean,
    multiple: Boolean,
    options: [{
      name: String,
      price: Number
    }]
  }])
  options?: Array<{
    name: string;
    required: boolean;
    multiple: boolean;
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;

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