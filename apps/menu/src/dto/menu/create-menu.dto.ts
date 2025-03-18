import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityDto } from '../common/availability.dto';

export class CreateMenuDto {
  @ApiProperty({ description: 'Restaurant ID', example: '60d21b4667d0d8992e610c85' })
  @IsMongoId()
  restaurantId: string;

  @ApiProperty({ description: 'Menu name', example: 'Lunch Menu', type: String })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Menu description', example: 'Available weekdays from 11am to 3pm', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the menu is active', example: true, default: true, type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Menu availability settings',
    type: AvailabilityDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
} 