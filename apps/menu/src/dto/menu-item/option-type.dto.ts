import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOptionValueDto, UpdateOptionValueDto, OptionValueDto } from './option-value.dto';

export class OptionTypeDto {
  @ApiPropertyOptional({ description: 'Unique option identifier', example: 'size-option-123' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Option group name', example: 'Size' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Option group description', example: 'Choose your pizza size' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether selecting an option is required', example: true, default: false })
  @IsBoolean()
  required: boolean = false;

  @ApiProperty({ description: 'Whether multiple options can be selected', example: false, default: false })
  @IsBoolean()
  multiple: boolean = false;

  @ApiPropertyOptional({ description: 'Minimum selections required (if multiple)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSelections?: number;

  @ApiPropertyOptional({ description: 'Maximum selections allowed (if multiple)', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxSelections?: number;

  @ApiProperty({ description: 'Available option values', type: [OptionValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OptionValueDto)
  values: OptionValueDto[];

  @ApiPropertyOptional({ description: 'Display order for this option group', example: 1, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  displayOrder?: number = 0;
}

export class CreateOptionTypeDto extends OptionTypeDto {
  @ApiProperty({ description: 'Available option values', type: [CreateOptionValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionValueDto)
  values: CreateOptionValueDto[];
}

export class UpdateOptionTypeDto extends OptionTypeDto {
  @ApiProperty({ description: 'Available option values', type: [UpdateOptionValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateOptionValueDto)
  values: UpdateOptionValueDto[];
} 