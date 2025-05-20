import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * DTO for service token generation requests
 */
export class ServiceTokenDto {
  @ApiProperty({
    description: 'Unique identifier for the service',
    example: 'menu-service-123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  serviceId: string;

  @ApiProperty({
    description: 'Name of the service requesting a token',
    example: 'menu-service',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  serviceName: string;

  @ApiProperty({
    description: 'List of permissions the service is requesting',
    example: ['user:read', 'menu:write'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({
    description: 'API key for service authentication',
    example: 'sk_service_ZXdhYWFkYXd3ZmF3ZWY=',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  apiKey: string;

  @ApiProperty({
    description: 'Token expiration time (e.g., "1h", "7d", "30m")',
    example: '1h',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\d+)([smhd])$/, { 
    message: 'expiresIn must be in format like "30s", "15m", "2h", or "7d"' 
  })
  expiresIn?: string;
} 