import { ApiProperty, ApiPropertyOptional } from '@app/common/swagger/decorators/api-property.decorator';
import { IsString, IsBoolean, IsOptional, IsNumber, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class OptionValueDto {
  @ApiProperty({ description: 'Option value name', example: 'Small' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Additional price for this option', example: 2.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number = 0;

  @ApiPropertyOptional({ description: 'Whether this option value is available', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean = true;

  @ApiPropertyOptional({ description: 'Description of this option value', example: '12 inch diameter' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'External ID for integrations', example: 'POS-123' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class CreateOptionValueDto extends OptionValueDto {}

export class UpdateOptionValueDto extends OptionValueDto {} 