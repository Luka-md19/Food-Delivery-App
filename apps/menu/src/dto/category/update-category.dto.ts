import { ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Appetizers', type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Start your meal with these delicious options', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category image URL', example: 'https://example.com/images/appetizers.jpg', type: String })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1, type: Number })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the category is active', example: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Parent category ID', example: '60d21b4667d0d8992e610c86', type: String })
  @IsOptional()
  @IsString()
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 