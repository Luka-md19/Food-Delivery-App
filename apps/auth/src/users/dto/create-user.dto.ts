// apps/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@app/common';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: [UserRole.CUSTOMER],
    enum: UserRole,
    isArray: true,
    description:
      'Array of roles. You can also provide a single role using the key "roles". Defaults to CUSTOMER if not provided.',
  })
  @IsOptional()
  @IsEnum(UserRole, { each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return [UserRole.CUSTOMER];
    return Array.isArray(value) ? value : [value];
  }, { toClassOnly: true })
  roles?: UserRole[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isActive?: boolean;
}
