import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateCurrentUserDto {
    @ApiPropertyOptional({
        example: 'John',
        description: 'Updated first name of the user'
    })
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty({ message: 'First name cannot be empty' })
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({
        example: 'Doe',
        description: 'Updated last name of the user'
    })
    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty({ message: 'Last name cannot be empty' })
    @IsOptional()
    lastName?: string;
}