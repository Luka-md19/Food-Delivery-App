import { ApiProperty } from '@nestjs/swagger';
import { FailedMessage } from '../../schemas/common/failed-message.schema';

export class FailedMessageDto {
  @ApiProperty({ description: 'Unique identifier for the failed message' })
  id: string;

  @ApiProperty({ description: 'Event pattern or API endpoint that failed' })
  pattern: string;

  @ApiProperty({ description: 'Number of retry attempts made' })
  retryCount: number;

  @ApiProperty({ description: 'Details about the last error encountered', required: false })
  lastError?: Record<string, any>;

  @ApiProperty({ description: 'Date and time the message was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date and time the message was last updated' })
  updatedAt: Date;

  /**
   * Static factory method to convert a FailedMessage entity to DTO
   * This encapsulates the transformation logic in one place
   */
  static fromEntity(entity: FailedMessage & { _id?: any }): FailedMessageDto {
    const dto = new FailedMessageDto();
    dto.id = entity._id?.toString();
    dto.pattern = entity.pattern;
    dto.retryCount = entity.retryCount;
    dto.lastError = entity.lastError;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
} 