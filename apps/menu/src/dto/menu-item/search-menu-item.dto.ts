import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum SortField {
  NAME = 'name',
  PRICE = 'price',
  CREATED_AT = 'createdAt'
}

export class PriceRangeDto {
  @ApiPropertyOptional({ description: 'Minimum price', example: 5.00, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 20.00, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max?: number;
}

export class SearchMenuItemDto {
  @ApiPropertyOptional({ description: 'Text search query', example: 'pizza', type: String })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Category ID', example: '60d21b4667d0d8992e610c85', type: String })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tags to filter by', example: ['vegetarian', 'spicy'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Dietary restrictions', example: ['vegetarian', 'glutenFree'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary?: string[];

  @ApiPropertyOptional({ description: 'Price range', type: PriceRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @ApiPropertyOptional({ description: 'Whether to include only available items', example: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  available?: boolean;

  @ApiPropertyOptional({ description: 'Whether to include only featured items', example: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Field to sort by', example: 'price', enum: SortField, default: SortField.NAME })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.NAME;

  @ApiPropertyOptional({ description: 'Sort order', example: 'asc', enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value) || 10)
  limit?: number = 10;
} 