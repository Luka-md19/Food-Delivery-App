import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { LoggerFactory } from '@app/common';
import { AuthErrorHandlerService } from '../../common/auth-error-handler.service';
import { ISessionManager } from '../interfaces/session.interface';
import { SessionDto } from '../dto/session.dto';

@Injectable()
export class SessionService implements ISessionManager {
  private readonly logger = LoggerFactory.getLogger(SessionService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService
  ) {
    this.logger.log('Session Service initialized');
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    try {
      return this.refreshTokenRepository.find({
        where: { 
          userId,
          isRevoked: false,
          expiresAt: MoreThan(new Date())
        },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      return this.errorHandler.handleUnexpectedError(error, 'getActiveSessions');
    }
  }

  /**
   * Validate a refresh token
   */
  async validateRefreshToken(user: User, token: string): Promise<void> {
    try {
      const foundToken = await this.refreshTokenRepository.findOne({
        where: { token, userId: user.id, isRevoked: false }
      });
      
      if (!foundToken) {
        this.logger.debug(`Refresh token not found for user ${user.id}`);
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      if (foundToken.isExpired()) {
        this.logger.debug(`Refresh token ${foundToken.id} is expired`);
        throw new UnauthorizedException('Refresh token has expired');
      }
      
    } catch (error) {
      return this.errorHandler.handleRefreshTokenError(error);
    }
  }

  /**
   * Remove (revoke) a refresh token
   */
  async removeRefreshToken(user: User, token: string): Promise<void> {
    try {
      const result = await this.refreshTokenRepository.update(
        { token, userId: user.id },
        { isRevoked: true }
      );
      
      if (result.affected === 0) {
        this.logger.warn(`Failed to revoke refresh token for user ${user.id}`);
      }
    } catch (error) {
      return this.errorHandler.handleUnexpectedError(error, 'removeRefreshToken');
    }
  }

  /**
   * Revoke a specific session by ID
   */
  async revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }> {
    try {
      const session = await this.refreshTokenRepository.findOne({
        where: { id: sessionId }
      });
  
      if (!session) {
        throw new NotFoundException('Session not found');
      }
  
      // Only allow users to revoke their own sessions unless they're an admin
      if (session.userId !== userId && !isAdmin) {
        throw new ForbiddenException('You can only revoke your own sessions');
      }
  
      session.isRevoked = true;
      await this.refreshTokenRepository.save(session);
      
      return { message: 'Session revoked successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return this.errorHandler.handleNotFoundError(error, 'Session');
      }
      
      if (error instanceof ForbiddenException) {
        return this.errorHandler.handleForbiddenError(error);
      }
      
      return this.errorHandler.handleUnexpectedError(error, 'revokeSession');
    }
  }
  
  /**
   * Delete a session by its ID
   */
  async deleteSession(sessionId: string, userId: string, isAdmin: boolean = false): Promise<{ message: string }> {
    this.logger.debug(`Attempting to delete session ${sessionId} for user ${userId}`);
    
    try {
      // First check if the session exists and belongs to the user
      const session = await this.refreshTokenRepository.findOne({
        where: { id: sessionId }
      });
      
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      
      // Only allow users to delete their own sessions unless they're an admin
      if (session.userId !== userId && !isAdmin) {
        throw new ForbiddenException('You can only delete your own sessions');
      }
      
      // Delete the session
      await this.refreshTokenRepository.delete(sessionId);
      
      this.logger.log(`Session ${sessionId} successfully deleted for user ${userId}`);
      return { message: 'Session deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return this.errorHandler.handleNotFoundError(error, 'Session');
      }
      
      if (error instanceof ForbiddenException) {
        return this.errorHandler.handleForbiddenError(error);
      }
      
      return this.errorHandler.handleUnexpectedError(error, 'deleteSession');
    }
  }
} 