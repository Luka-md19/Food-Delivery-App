import { Injectable, Logger, UnauthorizedException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { ITokenService } from './interfaces/token-service.interface';

@Injectable()
export class TokenService implements ITokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(user: User, token: string): Promise<RefreshToken> {
    // Set expiration for 7 days (adjust as needed)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshToken = this.refreshTokenRepository.create({
      token,
      user,
      expiresAt,
      isRevoked: false,
    });
    return this.refreshTokenRepository.save(refreshToken);
  }

  async validateRefreshToken(user: User, token: string): Promise<void> {
    const foundToken = await this.refreshTokenRepository.findOne({
      where: { token, user: { id: user.id }, isRevoked: false },
      relations: ['user'],
    });
    if (!foundToken || foundToken.isExpired()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async removeRefreshToken(user: User, token: string): Promise<void> {
    const result = await this.refreshTokenRepository.update(
      { token, user: { id: user.id } },
      { isRevoked: true }
    );
    
    if (result.affected === 0) {
      this.logger.warn(`Failed to revoke refresh token for user ${user.id}`);
    }
  }

  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { 
        user: { id: userId },
        isRevoked: false,
        expiresAt: MoreThan(new Date())
      },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async revokeSession(userId: string, sessionId: string, isAdmin: boolean): Promise<{ message: string }> {
    const session = await this.refreshTokenRepository.findOne({
      where: { id: sessionId },
      relations: ['user']
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only allow users to revoke their own sessions unless they're an admin
    if (session.user.id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    session.isRevoked = true;
    await this.refreshTokenRepository.save(session);
    
    return { message: 'Session revoked successfully' };
  }

  async revokeAllTokens(userId: string): Promise<{ message: string; count: number }> {
    this.logger.log(`Revoking all tokens for user ${userId}`);
    
    try {
      const result = await this.refreshTokenRepository.update(
        { user: { id: userId }, isRevoked: false },
        { isRevoked: true }
      );
      
      if (result.affected === 0) {
        this.logger.warn(`No active tokens found for user ${userId}`);
        return { message: 'No active tokens found', count: 0 };
      }
      
      this.logger.log(`Successfully revoked ${result.affected} tokens for user ${userId}`);
      return { 
        message: 'All tokens revoked successfully', 
        count: result.affected 
      };
    } catch (error) {
      this.logger.error(`Failed to revoke tokens for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to revoke tokens due to a database error');
    }
  }
}