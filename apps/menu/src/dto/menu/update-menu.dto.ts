import { ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityDto } from '../common/availability.dto';

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: 'Menu name', example: 'Lunch Menu', type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Menu description', example: 'Available weekdays from 11am to 3pm', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the menu is active', example: true, type: Boolean })
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