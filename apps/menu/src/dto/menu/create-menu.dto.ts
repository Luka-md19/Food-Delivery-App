import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityDto } from '../common/availability.dto';

export class CreateMenuDto {
  @ApiProperty({ 
    description: 'Restaurant ID', 
    example: '6437f7f744bd1802c0f55891' 
  })
  @IsMongoId()
  restaurantId: string;

  @ApiProperty({ 
    description: 'Menu name', 
    example: 'Seasonal Dinner Menu', 
    type: String 
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({ 
    description: 'Menu description', 
    example: 'Our chef\'s curated selection of seasonal dishes featuring locally-sourced ingredients. Available daily from 5pm to 10pm.', 
    type: String 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Whether the menu is active', 
    example: true, 
    default: true, 
    type: Boolean 
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Menu availability settings',
    example: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '17:00',
      endTime: '22:00'
    },
    type: AvailabilityDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

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
  @IsOptional()
  metadata?: Record<string, any>;
} 