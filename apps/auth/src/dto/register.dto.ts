import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match, UserRole } from '@app/common';
import { Transform } from 'class-transformer';
import { PasswordStrength } from '@app/common';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address for the new user account',
    required: true
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Password for the new account (must be at least 8 characters and include uppercase, lowercase, number, and special character)',
    required: true,
    minLength: 8
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @PasswordStrength({
    message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Confirmation of the password (must match password)',
    required: true
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(8, { message: 'Confirm password must be at least 8 characters long' })
  @Match('password', { message: 'Confirm password must match password' })
  confirmPassword: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
    required: true
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
    required: true
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({
    example: [UserRole.CUSTOMER],
    enum: UserRole,
    isArray: true,
    description: 'Optional user roles. Defaults to CUSTOMER if not provided.',
    enumName: 'UserRole'
  })
  @IsOptional()
  @IsEnum(UserRole, { 
    message: 'Role must be one of: ADMIN, CUSTOMER, DELIVERY_AGENT, RESTAURANT',
    each: true 
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return [UserRole.CUSTOMER];
    // Handle both string and array inputs
    return typeof value === 'string' ? [value] : value;
  }, { toClassOnly: true })
  roles?: UserRole[];
}