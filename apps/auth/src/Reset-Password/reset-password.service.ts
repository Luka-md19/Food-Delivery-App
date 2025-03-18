import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResetPasswordToken } from './reset-password-token.entity';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ResetPasswordService {
  private readonly logger = new Logger(ResetPasswordService.name);
  private readonly TOKEN_EXPIRATION_MINUTES = 15; 

  constructor(
    @InjectRepository(ResetPasswordToken)
    private resetPasswordRepository: Repository<ResetPasswordToken>,
    private readonly usersService: UsersService,
  ) {}

  async createResetToken(email: string): Promise<string> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRATION_MINUTES);

    const resetToken = this.resetPasswordRepository.create({
      token,
      user,
      expiresAt,
    });

    try {
      await this.resetPasswordRepository.save(resetToken);
    } catch (error) {
      this.logger.error('Error saving reset token', error);
      throw new InternalServerErrorException('Could not create reset token');
    }

    // In production, you would send this token to the user’s email address.
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<User> {
    const resetToken = await this.resetPasswordRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!resetToken) {
      throw new BadRequestException('Invalid reset token');
    }
    if (resetToken.used) {
      throw new BadRequestException('Reset token has already been used');
    }
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }
    const user = resetToken.user;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);
    resetToken.used = true;
    await this.resetPasswordRepository.save(resetToken);
    return user;
  }
}
