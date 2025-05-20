import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { BaseDto } from '@app/common/swagger/dto';
import { AvailabilityDto } from '../common/availability.dto';

export class MenuResponseDto extends BaseDto {
  @ApiProperty({ 
    description: 'Restaurant ID', 
    example: '6437f7f744bd1802c0f55891' 
  })
  restaurantId: string;

  @ApiProperty({ 
    description: 'Menu name', 
    example: 'Seasonal Dinner Menu' 
  })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Menu description', 
    example: 'Our chef\'s curated selection of seasonal dishes featuring locally-sourced ingredients. Available daily from 5pm to 10pm.' 
  })
  description?: string;

  @ApiProperty({ 
    description: 'Whether the menu is active', 
    example: true, 
    type: Boolean 
  })
  active: boolean;

  @ApiPropertyOptional({ 
    description: 'Menu availability settings',
    example: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '17:00',
      endTime: '22:00'
    },
    type: AvailabilityDto
  })
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ 
    description: 'Categories in this menu', 
    example: [
      '6437f8a144bd1802c0f55893',
      '6437f8a144bd1802c0f55894',
      '6437f8a144bd1802c0f55895'
    ],
    type: [String] 
  })
  categories?: string[];

  @ApiPropertyOptional({ 
    description: 'Custom metadata', 
    example: {
      seasonName: "Summer 2023",
      chefSpecial: true,
      estimatedDuration: "90 minutes",
      allergenWarning: "Contains nuts, dairy, and gluten",
      winePairingAvailable: true
    },
    type: Object 
  })
  metadata?: Record<string, any>;
} 