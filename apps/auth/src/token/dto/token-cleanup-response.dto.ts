import { ApiProperty } from '@nestjs/swagger';

export class TokenCleanupResponseDto {
  @ApiProperty({ description: 'Number of tokens marked as revoked', example: 5 })
  revoked: number;

  @ApiProperty({ description: 'Number of tokens permanently deleted', example: 10 })
  deleted: number;
} 