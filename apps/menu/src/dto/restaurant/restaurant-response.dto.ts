import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';

class AddressDto {
  @ApiProperty({ description: 'Street address', example: '789 Restaurant Boulevard' })
  street: string;

  @ApiProperty({ description: 'City', example: 'San Francisco' })
  city: string;

  @ApiPropertyOptional({ description: 'State or province', example: 'CA' })
  state?: string;

  @ApiProperty({ description: 'Zip or postal code', example: '94103' })
  zipCode: string;

  @ApiProperty({ description: 'Country', example: 'USA' })
  country: string;
}

class OpeningHoursDto {
  @ApiProperty({ description: 'Day of week (0-6, where 0 is Sunday)', example: 1 })
  dayOfWeek: number;

  @ApiProperty({ description: 'Opening time (24-hour format)', example: '11:30' })
  open: string;

  @ApiProperty({ description: 'Closing time (24-hour format)', example: '22:00' })
  close: string;
}

export class RestaurantResponseDto {
  @ApiProperty({ description: 'Restaurant ID', example: '6437f7f744bd1802c0f55891' })
  id: string;

  @ApiProperty({ description: 'Restaurant name', example: 'The Golden Spoon' })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Restaurant description', 
    example: 'An award-winning farm-to-table restaurant serving seasonal California cuisine with Mediterranean influences in a rustic-chic setting with patio seating.' 
  })
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
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Restaurant phone number', example: '+1-415-555-7890' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Restaurant email', example: 'reservations@goldenspoon.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Restaurant website', example: 'https://www.goldenspoon.com' })
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
  openingHours?: OpeningHoursDto[];

  @ApiProperty({ description: 'Whether the restaurant is active', example: true })
  active: boolean;

  @ApiPropertyOptional({ 
    description: 'Cuisine types', 
    example: ['California', 'Mediterranean', 'Farm-to-Table', 'Seasonal'] 
  })
  cuisineTypes?: string[];

  @ApiPropertyOptional({ 
    description: 'Tags', 
    example: ['Outdoor Seating', 'Sustainable', 'Vegetarian-Friendly', 'Wine Selection', 'Craft Cocktails'] 
  })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Price range (1-4, $ to $$$$)', example: 3 })
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
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation date', example: '2023-06-15T08:30:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date', example: '2023-07-20T14:45:00Z' })
  updatedAt: Date;
} 