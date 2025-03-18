import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  BadRequestException,
  Patch,
  Delete,
  Req,
  Query,
  Param,
  Headers,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiExtraModels
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiAuth, CurrentUser, Jwtpayload } from '@app/common';
import { JwtAuthGuard } from '@app/common';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { LogoutDto } from './dto/Logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { 
  RateLimit, 
  StrictRateLimit, 
  StandardRateLimit, 
  RelaxedRateLimit,
  SkipRateLimit
} from '@app/common/rate-limiter';

@ApiTags('Authentication')
@Controller('auth')
@ApiExtraModels(RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdatePasswordDto, UpdateCurrentUserDto, LogoutDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit('AUTH', 'register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ 
    description: 'User registered successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'User registered successfully' },
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid input or email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @RateLimit('AUTH', 'login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ 
    description: 'User logged in successfully',
    schema: {
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: { 
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiAuth()
  @SkipRateLimit()
  @ApiOperation({ summary: 'Logout and invalidate refresh & access tokens' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ 
    description: 'Logout successful',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logout successful' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async logout(
    @CurrentUser() user: Jwtpayload,
    @Body() logoutDto: LogoutDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ message: string }> {
    const token = authHeader.split(' ')[1];
    return this.authService.logout(user.userId, logoutDto.refreshToken, token);
  }

  @Post('refresh')
  @RateLimit('AUTH', 'refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      },
      required: ['refreshToken']
    }
  })
  @ApiOkResponse({ 
    description: 'Access token refreshed successfully',
    schema: {
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Get('profile')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
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

  @Post('forgot-password')
  @RateLimit('AUTH', 'forgotPassword')
  @ApiOperation({ summary: 'Initiate forgot password process' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ 
    description: 'Reset token generated and sent via email',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password reset email sent' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Email not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @RateLimit('AUTH', 'resetPassword')
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ 
    description: 'Password reset successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password reset successfully' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid token or passwords do not match' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmNewPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @Post('update-password')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @RateLimit('AUTH', 'updatePassword')
  @ApiOperation({ summary: 'Update password for authenticated user' })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiOkResponse({ 
    description: 'Password updated successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password updated successfully' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid password or passwords do not match' })
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

  @Patch('profile')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @SkipRateLimit()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateCurrentUserDto })
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

  @Delete('profile')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @RateLimit('AUTH', 'deleteAccount')
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @SkipRateLimit()
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiOkResponse({ description: 'Redirects to Google authentication' })
  googleAuth() {
    // Handled automatically by Passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @SkipRateLimit()
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiOkResponse({ 
    description: 'Google authentication successful',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: { 
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        }
      }
    }
  })
  googleAuthRedirect(@Req() req) {
    return req.user;
  }

  @Get('verify-email')
  @RateLimit('AUTH', 'verifyEmail')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiQuery({ 
    name: 'token', 
    required: true, 
    description: 'Email verification token sent to user email', 
    type: String 
  })
  @ApiOkResponse({ 
    description: 'Email verified successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Email verified successfully' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    const verified = await this.authService.verifyEmail(token);
    if (!verified) {
      throw new BadRequestException('Invalid or expired token');
    }
    return { message: 'Email verified successfully' };
  }

  @Get('sessions')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active sessions for the current user' })
  @ApiOkResponse({ 
    description: 'Active sessions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          deviceInfo: { type: 'string', example: 'Chrome on Windows' },
          createdAt: { type: 'string', format: 'date-time' },
          lastActive: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getSessions(@CurrentUser() user: Jwtpayload) {
    return this.authService.getActiveSessions(user.userId);
  }

  @Delete('sessions/:id')
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a session (logout from a device)' })
  @RateLimit('AUTH', 'revokeSessions')
  @ApiParam({ name: 'id', description: 'Session ID to revoke', type: String })
  @ApiOkResponse({ 
    description: 'Session revoked successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Session revoked successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async revokeSession(
    @CurrentUser() user: Jwtpayload,
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    return this.authService.revokeSession(user, sessionId);
  }
}