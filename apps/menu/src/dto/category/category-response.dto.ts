import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { BaseDto } from '@app/common/swagger/dto';

export class CategoryResponseDto extends BaseDto {
  @ApiProperty({ description: 'Menu ID', example: '60d21b4667d0d8992e610c86', type: String })
  menuId: string;

  @ApiProperty({ description: 'Category name', example: 'Appetizers', type: String })
  name: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Start your meal with these delicious options', type: String })
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL', example: 'https://example.com/images/appetizers.jpg', type: String })
  image?: string;

  @ApiProperty({ description: 'Display order', example: 1, type: Number })
  displayOrder: number;

  @ApiProperty({ description: 'Whether the category is active', example: true, type: Boolean })
  active: boolean;

  @ApiPropertyOptional({ description: 'Parent category ID', example: '60d21b4667d0d8992e610c87', type: String })
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  metadata?: Record<string, any>;
} 