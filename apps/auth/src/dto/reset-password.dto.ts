import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '@app/common';

export class ResetPasswordDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
    description: 'The password reset token received by email',
    required: true
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({ 
    example: 'NewPassword@123', 
    description: 'The new password (must be at least 8 characters)',
    required: true,
    minLength: 8
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({ 
    example: 'NewPassword@123', 
    description: 'Confirmation of the new password (must match new password)',
    required: true
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @Match('newPassword', { message: 'Confirm password must match new password' })
  confirmNewPassword: string;
}