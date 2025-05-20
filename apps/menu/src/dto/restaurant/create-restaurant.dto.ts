import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { 
  IsString, 
  IsEmail, 
  IsUrl, 
  IsBoolean, 
  IsInt, 
  IsPositive,
  IsOptional, 
  Min, 
  Max, 
  IsArray, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @ApiProperty({ description: 'Street address', example: '789 Restaurant Boulevard' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City', example: 'San Francisco' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: 'State or province', example: 'CA' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Zip or postal code', example: '94103' })
  @IsString()
  zipCode: string;

  @ApiProperty({ description: 'Country', example: 'USA' })
  @IsString()
  country: string;
}

class OpeningHoursDto {
  @ApiProperty({ description: 'Day of week (0-6, where 0 is Sunday)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'Opening time (24-hour format)', example: '11:30' })
  @IsString()
  open: string;

  @ApiProperty({ description: 'Closing time (24-hour format)', example: '22:00' })
  @IsString()
  close: string;
}

export class CreateRestaurantDto {
  @ApiProperty({ description: 'Restaurant name', example: 'The Golden Spoon' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant description', 
    example: 'An award-winning farm-to-table restaurant serving seasonal California cuisine with Mediterranean influences in a rustic-chic setting with patio seating.' 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant address',
    example: {
      street: '789 Restaurant Boulevard',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      country: 'USA'
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Restaurant phone number', example: '+1-415-555-7890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Restaurant email', example: 'reservations@goldenspoon.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Restaurant website', example: 'https://www.goldenspoon.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant opening hours',
    example: [
      { dayOfWeek: 1, open: '11:30', close: '22:00' },
      { dayOfWeek: 2, open: '11:30', close: '22:00' },
      { dayOfWeek: 3, open: '11:30', close: '22:00' },
      { dayOfWeek: 4, open: '11:30', close: '23:00' },
      { dayOfWeek: 5, open: '11:30', close: '23:00' },
      { dayOfWeek: 6, open: '10:00', close: '23:00' },
      { dayOfWeek: 0, open: '10:00', close: '21:00' }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursDto)
  openingHours?: OpeningHoursDto[];

  @ApiPropertyOptional({ description: 'Whether the restaurant is active', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Cuisine types', 
    example: ['California', 'Mediterranean', 'Farm-to-Table', 'Seasonal'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineTypes?: string[];

  @ApiPropertyOptional({ 
    description: 'Tags', 
    example: ['Outdoor Seating', 'Sustainable', 'Vegetarian-Friendly', 'Wine Selection', 'Craft Cocktails'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Price range (1-4, $ to $$$$)', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priceRange?: number;

  @ApiPropertyOptional({ 
    description: 'Custom metadata',
    example: {
      parkingAvailable: true,
      reservationRequired: true,
      privateEventSpace: true,
      chefName: "Maria Johnson",
      sustainabilityRating: 4.5,
      hasWifi: true
    }
  })
  @IsOptional()
  metadata?: Record<string, any>;
} 