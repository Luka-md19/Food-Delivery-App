import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsArray, IsNumber, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityDto {
  @ApiProperty({ 
    description: 'Days of week when menu is available (0-6, where 0 is Sunday)', 
    example: [1, 2, 3, 4, 5],
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek: number[];

  @ApiPropertyOptional({ 
    description: 'Start time in 24-hour format', 
    example: '11:00',
    type: String
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ 
    description: 'End time in 24-hour format', 
    example: '22:00',
    type: String
  })
  @IsOptional()
  @IsString()
  endTime?: string;
} 