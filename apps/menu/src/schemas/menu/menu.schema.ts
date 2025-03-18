import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MenuDocument = Menu & Document;

@Schema({
  timestamps: true,
  collection: 'menus',
  versionKey: 'version',
})
export class Menu {
  @ApiProperty({ description: 'Restaurant ID', example: '60d21b4667d0d8992e610c85' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    required: true,
    index: true 
  })
  restaurantId: string;

  @ApiProperty({ description: 'Menu name', example: 'Lunch Menu' })
  @Prop({ required: true })
  name: string;

  @ApiPropertyOptional({ description: 'Menu description', example: 'Available weekdays from 11am to 3pm' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Whether the menu is active', example: true })
  @Prop({ default: true })
  active: boolean;

  @ApiPropertyOptional({ 
    description: 'Menu availability settings',
    example: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '11:00',
      endTime: '15:00'
    }
  })
  @Prop({
    type: {
      daysOfWeek: [Number],
      startTime: String,
      endTime: String
    }
  })
  availability?: {
    daysOfWeek: number[];
    startTime?: string;
    endTime?: string;
  };

  @ApiPropertyOptional({ description: 'Categories in this menu', type: [String] })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }], default: [] })
  categories?: string[];

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

export const MenuSchema = SchemaFactory.createForClass(Menu);

// Add indexes for common query patterns
MenuSchema.index({ restaurantId: 1, active: 1 });
MenuSchema.index({ name: 'text', description: 'text' }); 