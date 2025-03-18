import { ApiProperty } from '@nestjs/swagger';

export class GoogleUserDto {
  @ApiProperty({
    example: '114252345676',
    description: 'Unique Google ID for the user'
  })
  googleId: string;

  @ApiProperty({
    example: 'user@gmail.com',
    description: 'User email from Google account'
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'First name from Google profile'
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name from Google profile'
  })
  lastName: string;
}