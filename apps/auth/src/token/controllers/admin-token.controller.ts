import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, LoggerFactory } from '@app/common';
import { TokenService } from '../token.service';
import { TokenCleanupResponseDto } from '../dto/token-cleanup-response.dto';

@ApiTags('Admin Token Management')
@Controller('admin/tokens')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTokenController {
  private readonly logger = LoggerFactory.getLogger(AdminTokenController.name);

  constructor(private readonly tokenService: TokenService) {}

  @Post('cleanup')
  @ApiOperation({ summary: 'Manually trigger cleanup of expired tokens (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token cleanup completed',
    type: TokenCleanupResponseDto
  })
  async triggerTokenCleanup(): Promise<TokenCleanupResponseDto> {
    this.logger.log('Admin triggered token cleanup');
    return await this.tokenService.manualCleanupExpiredTokens();
  }

  @Post('process-queue')
  @ApiOperation({ summary: 'Manually trigger processing of token queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Token processing triggered' })
  async triggerTokenProcessing(): Promise<{ message: string }> {
    this.logger.log('Admin triggered token queue processing');
    await this.tokenService.triggerTokenProcessing();
    return { message: 'Token processing queue triggered successfully' };
  }

  @Post('sync-blacklist')
  @ApiOperation({ summary: 'Synchronize token repository with blacklist (Admin only)' })
  @ApiResponse({ status: 200, description: 'Blacklist synchronization triggered' })
  async synchronizeBlacklist(): Promise<{ message: string }> {
    this.logger.log('Admin triggered blacklist synchronization');
    await this.tokenService.synchronizeTokenBlacklist();
    return { message: 'Token blacklist synchronization completed' };
  }

  @Get('sessions/:userId')
  @ApiOperation({ summary: 'Get all active sessions for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of active user sessions' })
  async getUserSessions(@Param('userId') userId: string) {
    return await this.tokenService.getActiveSessions(userId);
  }

  @Post('revoke/all/:userId')
  @ApiOperation({ summary: 'Revoke all tokens for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'All tokens revoked' })
  async revokeAllUserTokens(@Param('userId') userId: string) {
    return await this.tokenService.revokeAllTokens(userId);
  }
} 