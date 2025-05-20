import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerFactory } from '@app/common';
import { TokenCleanupResponseDto } from '../dto/token-cleanup-response.dto';
import { ITokenCleanupService } from '../interfaces/token-cleanup.interface';
import { ConfigService } from '@nestjs/config';
import { AuthErrorHandlerService } from '../../common/auth-error-handler.service';

@Injectable()
export class TokenCleanupService implements ITokenCleanupService {
  private readonly logger = LoggerFactory.getLogger(TokenCleanupService.name);
  private readonly tokenRetentionDays: number;
  private readonly cronSchedule: string;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService,
  ) {
    this.tokenRetentionDays = this.configService.get<number>('TOKEN_RETENTION_DAYS', 30);
    this.cronSchedule = this.configService.get<string>('TOKEN_CLEANUP_SCHEDULE', CronExpression.EVERY_DAY_AT_MIDNIGHT);
    
    this.logger.log('Token Cleanup Service initialized');
  }

  /**
   * Scheduled task to clean up expired tokens
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('Starting scheduled cleanup of expired tokens');
    
    try {
      const result = await this.performCleanup();
      this.logger.log(`Token cleanup complete: marked ${result.revoked} as revoked, deleted ${result.deleted} old tokens`);
    } catch (error) {
      this.logger.error(`Error during token cleanup: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Manual trigger for token cleanup
   * Can be used by admins to force cleanup
   */
  async manualCleanupExpiredTokens(): Promise<TokenCleanupResponseDto> {
    this.logger.log('Manually triggering token cleanup');
    
    try {
      return await this.performCleanup();
    } catch (error) {
      this.logger.error(`Error during manual token cleanup: ${error.message}`, error.stack);
      return this.errorHandler.handleUnexpectedError(error, 'manualCleanupExpiredTokens');
    }
  }

  /**
   * Performs the actual token cleanup operations
   * @private
   */
  private async performCleanup(): Promise<TokenCleanupResponseDto> {
    // Get current date
    const now = new Date();
    
    // Delete tokens that have expired more than retention period days ago
    const retentionDate = new Date(now);
    retentionDate.setDate(retentionDate.getDate() - this.tokenRetentionDays);
    
    // First soft-delete by marking as revoked
    const revokeResult = await this.tokenRepository.update(
      { expiresAt: LessThan(now), isRevoked: false },
      { isRevoked: true }
    );
    
    // Then hard-delete old expired tokens beyond retention period
    const deleteResult = await this.tokenRepository.delete({
      expiresAt: LessThan(retentionDate)
    });
    
    return {
      revoked: revokeResult.affected || 0,
      deleted: deleteResult.affected || 0
    };
  }
} 