import {
  Controller,
  Get,
  Delete,
  UseGuards,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CachedAuthService } from '../auth/services/cached-auth.service';
import { CurrentUser } from '@app/common/auth/decorators';
import { JwtAuthGuard } from '@app/common/auth/guards';
import { SessionService } from '../token/services/session.service';
import { DynamicRateLimit } from '@app/common/rate-limiter';
import { User } from '../users/entities/user.entity';
import { ApiAuth, Jwtpayload } from '@app/common';


@ApiTags('User Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiAuth()
export class SessionsController {
  constructor(
    private readonly authService: CachedAuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active sessions for the current user' })
  @ApiOkResponse({ 
    description: 'Active sessions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          deviceInfo: { type: 'string', example: 'Chrome on Windows' },
          createdAt: { type: 'string', format: 'date-time' },
          lastActive: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getSessions(@CurrentUser() user: Jwtpayload) {
    return this.authService.getActiveSessions(user.userId);
  }

  @Delete(':id')
  @DynamicRateLimit('AUTH', 'revokeSessions')
  @ApiOperation({ summary: 'Revoke a session (logout from a device)' })
  @ApiParam({ name: 'id', description: 'Session ID to revoke', type: String })
  @ApiOkResponse({ 
    description: 'Session revoked successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Session revoked successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async revokeSession(
    @CurrentUser() user: Jwtpayload,
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    return this.authService.revokeSession(user, sessionId);
  }
} 