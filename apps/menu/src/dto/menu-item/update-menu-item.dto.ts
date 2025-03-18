import { ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DietaryInfoDto } from './dietary-info.dto';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ description: 'Category ID', example: '60d21b4667d0d8992e610c85', type: String })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Menu item name', example: 'Caesar Salad', type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Menu item description', example: 'Fresh romaine lettuce with caesar dressing', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Menu item price', example: 12.99, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Menu item discounted price', example: 10.99, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'USD', type: String })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calories', example: 450, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ description: 'Spicy level (1-5)', example: 2, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  spicyLevel?: number;

  @ApiPropertyOptional({ 
    description: 'Dietary information',
    type: DietaryInfoDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DietaryInfoDto)
  dietary?: DietaryInfoDto;

  @ApiPropertyOptional({ description: 'Ingredients list', example: ['Lettuce', 'Croutons', 'Parmesan'], type: [String] })
  @IsOptional()
  @IsArray()
  ingredients?: string[];

  @ApiPropertyOptional({ description: 'Menu item options/variants', example: [{ name: 'Size', choices: ['Small', 'Medium', 'Large'] }] })
  @IsOptional()
  options?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Whether the item is available', example: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ description: 'Whether the item is featured', example: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Tags', example: ['Salad', 'Healthy', 'Lunch'], type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
} 