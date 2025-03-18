import { IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@app/common';

export class UpdateUserRolesDto {
  @ApiProperty({
    example: [UserRole.ADMIN, UserRole.CUSTOMER],
    description: 'Array of user roles to assign',
    enum: UserRole,
    isArray: true,
    enumName: 'UserRole'
  })
  @IsArray({ message: 'Roles must be provided as an array' })
  @IsEnum(UserRole, { 
    message: 'Each role must be one of: ADMIN, CUSTOMER, DELIVERY_AGENT, RESTAURANT',
    each: true 
  })
  roles: UserRole[];
}