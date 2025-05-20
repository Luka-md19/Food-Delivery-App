import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response DTO
 * This follows the Interface Segregation Principle by having a specific interface for error responses
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Timestamp of when the error occurred' })
  timestamp: string;

  @ApiProperty({ description: 'Request path that caused the error' })
  path: string;

  @ApiProperty({ 
    description: 'Error details', 
    type: 'object',
    additionalProperties: true 
  })
  error: any;
  
  constructor(data: Partial<ErrorResponseDto>) {
    Object.assign(this, data);
  }
} 