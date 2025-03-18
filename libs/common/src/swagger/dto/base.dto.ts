import { ApiProperty } from '../decorators/api-property.decorator';

/**
 * Base DTO class with common properties
 * This class can be extended by other DTOs to inherit common properties
 */
export abstract class BaseDto {
  /**
   * Unique identifier
   */
  @ApiProperty({ isId: true })
  id?: string;

  /**
   * Creation date
   */
  @ApiProperty({ type: Date })
  createdAt?: Date;

  /**
   * Last update date
   */
  @ApiProperty({ type: Date })
  updatedAt?: Date;

  /**
   * Version number for optimistic concurrency control
   */
  @ApiProperty({ type: Number, description: 'Version number for optimistic concurrency control' })
  version?: number;
} 