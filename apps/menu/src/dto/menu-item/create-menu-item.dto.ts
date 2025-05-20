import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, ArrayMinSize, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DietaryInfoDto } from './dietary-info.dto';
import { CreateOptionTypeDto } from './option-type.dto';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Category ID', example: '60d21b4667d0d8992e610c85', type: String })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Menu item name', example: 'Caesar Salad', type: String })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Menu item description', example: 'Fresh romaine lettuce with caesar dressing', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Menu item images', example: ['https://example.com/images/salad.jpg'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: 'Menu item price', example: 12.99, type: Number })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: 'Menu item discounted price', example: 10.99, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountedPrice?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'USD', type: String })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calories', example: 450, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  calories?: number;

  @ApiPropertyOptional({ description: 'Spicy level (1-5)', example: 2, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
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
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({ 
    description: 'Menu item options/variants',
    type: [CreateOptionTypeDto],
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
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionTypeDto)
  options?: CreateOptionTypeDto[];

  @ApiPropertyOptional({ description: 'Whether the item is available', example: true, default: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  available?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether the item is featured', example: false, default: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @ApiPropertyOptional({ description: 'Tags', example: ['Salad', 'Healthy', 'Lunch'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
} 