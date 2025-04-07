import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsBoolean, IsOptional } from 'class-validator';

export class DietaryInfoDto {
  @ApiPropertyOptional({ description: 'Whether the item is vegetarian', example: true, type: Boolean })
  @IsBoolean()
  @IsOptional()
  vegetarian?: boolean;

  @ApiPropertyOptional({ description: 'Whether the item is vegan', example: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  vegan?: boolean;

  @ApiPropertyOptional({ description: 'Whether the item is gluten-free', example: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  glutenFree?: boolean;

  @ApiPropertyOptional({ description: 'Whether the item is nut-free', example: true, type: Boolean })
  @IsBoolean()
  @IsOptional()
  nutFree?: boolean;
  
  @ApiPropertyOptional({ description: 'Whether the item is dairy-free', example: true, type: Boolean })
  @IsBoolean()
  @IsOptional()
  dairyFree?: boolean;
} 