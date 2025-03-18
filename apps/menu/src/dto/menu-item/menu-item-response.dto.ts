import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { BaseDto } from '@app/common/swagger/dto';
import { DietaryInfoDto } from './dietary-info.dto';

export class MenuItemResponseDto extends BaseDto {
  @ApiProperty({ description: 'Category ID', example: '60d21b4667d0d8992e610c85' })
  categoryId: string;

  @ApiProperty({ description: 'Menu item name', example: 'Caesar Salad' })
  name: string;

  @ApiPropertyOptional({ description: 'Menu item description', example: 'Fresh romaine lettuce with caesar dressing' })
  description?: string;

  @ApiPropertyOptional({ description: 'Menu item images', example: ['https://example.com/images/caesar-salad.jpg'] })
  images?: string[];

  @ApiProperty({ description: 'Menu item price', example: 12.99 })
  price: number;

  @ApiPropertyOptional({ description: 'Menu item discounted price', example: 10.99 })
  discountedPrice?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'USD' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15 })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calories', example: 450 })
  calories?: number;

  @ApiPropertyOptional({ description: 'Spicy level (1-5)', example: 2 })
  spicyLevel?: number;

  @ApiPropertyOptional({ 
    description: 'Dietary information',
    type: DietaryInfoDto
  })
  dietary?: DietaryInfoDto;

  @ApiPropertyOptional({ description: 'Ingredients list', example: ['Lettuce', 'Croutons', 'Parmesan'] })
  ingredients?: string[];

  @ApiPropertyOptional({ description: 'Menu item options/variants', example: [{ name: 'Size', choices: ['Small', 'Medium', 'Large'] }] })
  options?: Record<string, any>[];

  @ApiProperty({ description: 'Whether the item is available', example: true })
  available: boolean;

  @ApiProperty({ description: 'Whether the item is featured', example: false })
  featured: boolean;

  @ApiPropertyOptional({ description: 'Tags', example: ['Salad', 'Healthy', 'Lunch'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  metadata?: Record<string, any>;
} 