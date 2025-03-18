import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDto{
    @ApiProperty({
         example: 'user@example.com',
            description: 'the email address for password reset',
         })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}