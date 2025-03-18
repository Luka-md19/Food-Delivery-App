import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { BaseDto } from '@app/common/swagger/dto';
import { AvailabilityDto } from '../common/availability.dto';

export class MenuResponseDto extends BaseDto {
  @ApiProperty({ description: 'Restaurant ID', example: '60d21b4667d0d8992e610c85' })
  restaurantId: string;

  @ApiProperty({ description: 'Menu name', example: 'Lunch Menu' })
  name: string;

  @ApiPropertyOptional({ description: 'Menu description', example: 'Available weekdays from 11am to 3pm' })
  description?: string;

  @ApiProperty({ description: 'Whether the menu is active', example: true, type: Boolean })
  active: boolean;

  @ApiPropertyOptional({ 
    description: 'Menu availability settings',
    type: AvailabilityDto
  })
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Categories in this menu', type: [String] })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata', type: Object })
  metadata?: Record<string, any>;
} 