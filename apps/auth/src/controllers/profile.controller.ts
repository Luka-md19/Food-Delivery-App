import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Body,
  Logger,
  Put,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CachedAuthService } from '../auth/services/cached-auth.service';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { UpdatePasswordDto } from '../dto/update-password.dto';
import { DynamicRateLimit, SkipRateLimit } from '@app/common/rate-limiter';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ApiAuth, CurrentUser, JwtAuthGuard, Jwtpayload } from '@app/common';

@ApiTags('User Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiAuth()
@ApiExtraModels(UpdateCurrentUserDto, UpdatePasswordDto)
export class ProfileController {
  constructor(
    private readonly authService: CachedAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({ 
    description: 'User profile retrieved successfully',
    schema: {
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        roles: { 
          type: 'array',
          items: { type: 'string', enum: ['ADMIN', 'CUSTOMER', 'DELIVERY_AGENT', 'RESTAURANT'] }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getProfile(@CurrentUser() user: Jwtpayload) {
    return user;
  }

  @Patch()
  @SkipRateLimit()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ 
    description: 'User profile updated successfully',
    schema: {
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updateProfile(
    @CurrentUser() user: Jwtpayload,
    @Body() updateCurrentUserDto: UpdateCurrentUserDto,
  ) {
    return this.authService.updateProfile(user.userId, updateCurrentUserDto);
  }

  @Delete()
  @DynamicRateLimit('AUTH', 'deleteAccount')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiOkResponse({ 
    description: 'User account deleted successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'User account deleted successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async deleteProfile(@CurrentUser() user: Jwtpayload) {
    await this.authService.deleteAccount(user.userId);
    return { message: 'User account deleted successfully.' };
  }

  @Patch('password')
  @DynamicRateLimit('AUTH', 'updatePassword')
  @ApiOperation({ summary: 'Update password for authenticated user' })
  @ApiOkResponse({ 
    description: 'Password updated successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password updated successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updatePassword(
    @CurrentUser() user: Jwtpayload,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(
      user.userId,
      updatePasswordDto.oldPassword,
      updatePasswordDto.newPassword,
      updatePasswordDto.confirmNewPassword,
    );
  }
} 