import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetPasswordToken } from './reset-password-token.entity';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { LoggerFactory } from '@app/common';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ResetPasswordService {
  private readonly logger = LoggerFactory.getLogger(ResetPasswordService.name);
  private readonly tokenExpirationTime = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(ResetPasswordToken)
    private resetPasswordTokenRepository: Repository<ResetPasswordToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new reset password token for a user
   */
  async createToken(userId: string): Promise<string> {
    try {
      // Generate a random token
      const token = randomBytes(32).toString('hex');
      
      // Create expiration date 24 hours from now
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + this.tokenExpirationTime);
      
      // Save token to database
      const resetToken = this.resetPasswordTokenRepository.create({
        token,
        userId,
        expiresAt,
        used: false,
      });
      
      await this.resetPasswordTokenRepository.save(resetToken);
      
      this.logger.log(`Created reset password token for user: ${userId}`);
      
      return token;
    } catch (error) {
      this.logger.error(`Failed to create reset password token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a reset token for a user by email
   * @param email The email of the user
   * @returns The generated token
   */
  async createResetToken(email: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      this.logger.warn(`Reset password requested for nonexistent email: ${email}`);
      throw new NotFoundException(`User with email ${email} not found`);
    }
    
    return this.createToken(user.id);
  }

  /**
   * Reset a user's password using a token
   * @param token The reset token
   * @param newPassword The new password
   * @returns The user whose password was reset
   */
  async resetPassword(token: string, newPassword: string): Promise<User> {
    const resetToken = await this.verifyToken(token);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await this.userRepository.update(
      { id: resetToken.userId },
      { password: hashedPassword }
    );
    
    // Mark the token as used
    await this.markTokenAsUsed(token);
    
    // Return the updated user
    const user = await this.userRepository.findOne({ where: { id: resetToken.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${resetToken.userId} not found`);
    }
    
    return user;
  }

  /**
   * Verify a reset password token
   */
  async verifyToken(token: string): Promise<ResetPasswordToken> {
    const resetToken = await this.resetPasswordTokenRepository.findOne({
      where: { token, used: false },
    });
    
    if (!resetToken) {
      throw new NotFoundException('Reset password token not found or already used');
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      throw new NotFoundException('Reset password token has expired');
    }
    
    return resetToken;
  }

  /**
   * Mark a token as used after password reset
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await this.resetPasswordTokenRepository.update({ token }, { used: true });
    this.logger.log(`Marked reset token as used: ${token}`);
  }
  
  /**
   * Validate a reset token and return the user ID
   * @param token The reset token to validate
   * @returns The user ID associated with the token
   */
  async validateResetToken(token: string): Promise<string> {
    const resetToken = await this.verifyToken(token);
    return resetToken.userId;
  }
  
  /**
   * Invalidate a reset token
   * @param token The token to invalidate
   */
  async invalidateToken(token: string): Promise<void> {
    await this.markTokenAsUsed(token);
  }
} 