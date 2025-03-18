import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CategoryDocument = Category & Document;

@Schema({
  timestamps: true,
  collection: 'categories',
  versionKey: 'version',
})
export class Category {
  @ApiProperty({ description: 'Menu ID', example: '60d21b4667d0d8992e610c85' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    required: true,
    index: true 
  })
  menuId: string;

  @ApiProperty({ description: 'Category name', example: 'Appetizers' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Start your meal with something light' })
  @Prop()
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL', example: 'https://example.com/images/appetizers.jpg' })
  @Prop()
  image?: string;

  @ApiProperty({ description: 'Display order within menu', example: 1 })
  @Prop({ default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether the category is active', example: true })
  @Prop({ default: true })
  active: boolean;

  @ApiPropertyOptional({ description: 'Items in this category', type: [String] })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'MenuItem' }], default: [] })
  items?: string[];

  @ApiPropertyOptional({ description: 'Parent category ID for nested categories', example: '60d21b4667d0d8992e610c85' })
  @Prop({ type: MongooseSchema.Types.ObjectId })
  parentCategoryId?: string;

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

export const CategorySchema = SchemaFactory.createForClass(Category);

// Add indexes for common query patterns
CategorySchema.index({ menuId: 1, active: 1 });
CategorySchema.index({ menuId: 1, displayOrder: 1 });
CategorySchema.index({ name: 'text', description: 'text' }); 