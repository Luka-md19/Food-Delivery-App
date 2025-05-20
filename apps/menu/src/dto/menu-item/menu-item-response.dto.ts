import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { BaseDto } from '@app/common/swagger/dto';
import { DietaryInfoDto } from './dietary-info.dto';
import { OptionTypeDto } from './option-type.dto';

export class MenuItemResponseDto extends BaseDto {
  @ApiProperty({ description: 'Menu item ID', example: '60d21b4667d0d8992e610c85' })
  id: string;

  @ApiProperty({ description: 'Category ID', example: '60d21b4667d0d8992e610c85' })
  categoryId: string;

  @ApiProperty({ description: 'Menu item name', example: 'Caesar Salad' })
  name: string;

  @ApiPropertyOptional({ description: 'Menu item description', example: 'Fresh romaine lettuce with caesar dressing' })
  description?: string;

  @ApiPropertyOptional({ description: 'Menu item images', example: ['https://example.com/images/salad.jpg'] })
  images?: string[];

  @ApiProperty({ description: 'Menu item price', example: 12.99 })
  price: number;

  @ApiPropertyOptional({ description: 'Menu item discounted price', example: 10.99 })
  discountedPrice?: number;

  @ApiProperty({ description: 'Currency', example: 'USD', default: 'USD' })
  currency: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15 })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calories', example: 450 })
  calories?: number;

  @ApiPropertyOptional({ description: 'Spicy level (1-5)', example: 2 })
  spicyLevel?: number;

  @ApiPropertyOptional({ 
    description: 'Dietary information',
    type: DietaryInfoDto,
    example: {
      vegetarian: true,
      vegan: false,
      glutenFree: false
    }
  })
  dietary?: DietaryInfoDto;

  @ApiPropertyOptional({ description: 'Ingredients list', example: ['Lettuce', 'Croutons', 'Parmesan'] })
  ingredients?: string[];

  @ApiPropertyOptional({ 
    description: 'Menu item options/variants',
    type: [OptionTypeDto],
    example: [{
      name: 'Size',
      description: 'Select your preferred size',
      required: true,
      multiple: false,
      values: [
        { name: 'Small', price: 0 },
        { name: 'Medium', price: 2 },
        { name: 'Large', price: 4 }
      ]
    }]
  })
  options?: OptionTypeDto[];

  @ApiProperty({ description: 'Whether the item is available', example: true })
  available: boolean;

  @ApiProperty({ description: 'Whether the item is featured', example: false })
  featured: boolean;

  @ApiPropertyOptional({ description: 'Tags', example: ['Salad', 'Healthy', 'Lunch'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Created at timestamp', example: '2023-03-15T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp', example: '2023-03-15T12:30:00Z' })
  updatedAt: Date;
} 