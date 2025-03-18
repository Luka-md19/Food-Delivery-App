import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column } from 'typeorm';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address for authentication',
    required: true
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'User password for authentication',
    required: true
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({
    example: 'Chrome on Windows 10',
    description: 'Information about the device used for login'
  })
  @IsOptional()
  @Column({ nullable: true })
  deviceInfo?: string;
}