import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type RestaurantDocument = Restaurant & Document;

@Schema({
  timestamps: true,
  collection: 'restaurants',
  versionKey: 'version',
})
export class Restaurant {
  @ApiProperty({ description: 'Restaurant name', example: 'Pasta Paradise' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ description: 'Restaurant description', example: 'Authentic Italian cuisine in a cozy atmosphere' })
  @Prop()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant address',
    example: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    }
  })
  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  })
  address?: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Restaurant phone number', example: '+1-555-123-4567' })
  @Prop()
  phone?: string;

  @ApiPropertyOptional({ description: 'Restaurant email', example: 'contact@pastapara.com' })
  @Prop()
  email?: string;

  @ApiPropertyOptional({ description: 'Restaurant website', example: 'https://pastapara.com' })
  @Prop()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant opening hours',
    example: [
      { dayOfWeek: 1, open: '11:00', close: '22:00' },
      { dayOfWeek: 2, open: '11:00', close: '22:00' }
    ]
  })
  @Prop([{
    dayOfWeek: Number,
    open: String,
    close: String
  }])
  openingHours?: {
    dayOfWeek: number;
    open: string;
    close: string;
  }[];

  @ApiProperty({ description: 'Whether the restaurant is active', example: true })
  @Prop({ default: true })
  active: boolean;

  @ApiPropertyOptional({ description: 'Cuisine types', type: [String], example: ['Italian', 'Pizza', 'Pasta'] })
  @Prop({ type: [String], default: [] })
  cuisineTypes?: string[];

  @ApiPropertyOptional({ description: 'Tags', type: [String], example: ['Family-friendly', 'Outdoor seating'] })
  @Prop({ type: [String], default: [] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Price range (1-4, $ to $$$$)', example: 2 })
  @Prop({ min: 1, max: 4 })
  priceRange?: number;

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

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

// Add indexes for common query patterns
RestaurantSchema.index({ name: 'text', description: 'text' });
RestaurantSchema.index({ 'address.city': 1, active: 1 });
RestaurantSchema.index({ cuisineTypes: 1 });
RestaurantSchema.index({ tags: 1 }); 