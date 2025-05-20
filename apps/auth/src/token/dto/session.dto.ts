import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for session information
 */
export class SessionDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'User ID associated with this session' })
  userId: string;

  @ApiProperty({ description: 'When the session was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the session expires' })
  expiresAt: Date;

  @ApiProperty({ description: 'Whether the session has been revoked' })
  isRevoked: boolean;

  @ApiProperty({ description: 'Device information', required: false })
  deviceInfo?: string;
}

/**
 * Response DTO for session operations
 */
export class SessionResponseDto {
  @ApiProperty({ description: 'Message indicating the result of the operation' })
  message: string;

  @ApiProperty({ description: 'Session ID', required: false })
  sessionId?: string;
}

/**
 * DTO for the list of active sessions
 */
export class ActiveSessionsResponseDto {
  @ApiProperty({ description: 'List of active sessions', type: [SessionDto] })
  sessions: SessionDto[];

  @ApiProperty({ description: 'Total number of active sessions' })
  total: number;
} 