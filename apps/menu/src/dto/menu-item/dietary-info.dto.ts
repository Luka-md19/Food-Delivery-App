import { ApiProperty } from '@app/common/swagger/decorators/api-property.decorator';
import { IsBoolean } from 'class-validator';

export class DietaryInfoDto {
  @ApiProperty({ description: 'Whether the item is vegetarian', example: true, type: Boolean })
  @IsBoolean()
  vegetarian: boolean;

  @ApiProperty({ description: 'Whether the item is vegan', example: false, type: Boolean })
  @IsBoolean()
  vegan: boolean;

  @ApiProperty({ description: 'Whether the item is gluten-free', example: false, type: Boolean })
  @IsBoolean()
  glutenFree: boolean;

  @ApiProperty({ description: 'Whether the item is nut-free', example: true, type: Boolean })
  @IsBoolean()
  nutFree: boolean;
} 