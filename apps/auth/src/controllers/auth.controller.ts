import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    BadRequestException,
    Headers,
    Query,
  } from '@nestjs/common';
  import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
    ApiUnauthorizedResponse,
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiExtraModels,
  } from '@nestjs/swagger';
  import { ApiAuth, CurrentUser, Jwtpayload } from '@app/common';
  import { JwtAuthGuard } from '@app/common';
  import { AuthGuard } from '@nestjs/passport';
  import { RegisterDto } from '../dto/register.dto';
  import { LoginDto } from '../dto/login.dto';
  import { LogoutDto } from '../dto/Logout.dto';
  import { ForgotPasswordDto } from '../dto/forgot-password.dto';
  import { ResetPasswordDto } from '../dto/reset-password.dto';
  import { 
    SkipRateLimit,
    DynamicRateLimit
  } from '@app/common/rate-limiter';
import { CachedAuthService } from '../auth/services/cached-auth.service';
import { Logger } from '@nestjs/common';
  
  @ApiTags('Authentication')
  @Controller('auth')
  @ApiExtraModels(RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, LogoutDto)
  export class AuthController {
    private readonly logger = new Logger(AuthController.name);
  
    constructor(
      private readonly authService: CachedAuthService,
    ) {}
  
    @Post('register')
    @DynamicRateLimit('AUTH', 'register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterDto })
    @ApiCreatedResponse({ 
      description: 'User registered successfully',
      schema: {
        properties: {
          message: { type: 'string', example: 'User registered successfully. Please check your email to verify your account.' },
        }
      }
    })
    @ApiBadRequestResponse({ description: 'Invalid input or email already exists' })
    async register(@Body() registerDto: RegisterDto) {
      // Call the service to handle registration logic
      await this.authService.register(registerDto);
      
      // Return a more informative message regardless of what the service returns
      return {
        message: 'User registered successfully. Please check your email inbox (or Mailtrap if in development) to verify your account.'
      };
    }
  
    @Post('login')
    @DynamicRateLimit('AUTH', 'login')
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
              roles: { 
                type: 'array', 
                items: { 
                  type: 'string', 
                  example: 'customer' 
                }
              }
            }
          }
        }
      }
    })
    @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
      try {
        return await this.authService.login(loginDto);
      } catch (error) {
        // Log the error for debugging purposes
        this.logger.error(`Login failed: ${error.message}`, error.stack);
        
        // Rethrow the error to be handled by the global exception filter
        throw error;
      }
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
    @DynamicRateLimit('AUTH', 'refresh')
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
    
    @Post('forgot-password')
    @DynamicRateLimit('AUTH', 'forgotPassword')
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
    @DynamicRateLimit('AUTH', 'resetPassword')
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
  
    @Get('verify-email')
    @DynamicRateLimit('AUTH', 'verifyEmail')
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

    @Get('verification-status')
    @UseGuards(JwtAuthGuard)
    @ApiAuth()
    @SkipRateLimit()
    @ApiOperation({ summary: 'Check email verification status' })
    @ApiOkResponse({
      description: 'Email verification status',
      schema: {
        properties: {
          isVerified: { type: 'boolean', example: true },
          email: { type: 'string', example: 'user@example.com' }
        }
      }
    })
    async verificationStatus(@CurrentUser() user: Jwtpayload): Promise<{ isVerified: boolean; email: string }> {
      const userEntity = await this.authService.getUserById(user.userId);
      return {
        isVerified: userEntity.isEmailVerified,
        email: userEntity.email
      };
    }

    @Post('resend-verification')
    @UseGuards(JwtAuthGuard)
    @ApiAuth()
    @DynamicRateLimit('AUTH', 'resendVerification')
    @ApiOperation({ summary: 'Resend verification email' })
    @ApiOkResponse({
      description: 'Verification email sent',
      schema: {
        properties: {
          message: { type: 'string', example: 'Verification email sent' },
          email: { type: 'string', example: 'user@example.com' }
        }
      }
    })
    @ApiBadRequestResponse({ description: 'Email already verified' })
    async resendVerification(@CurrentUser() user: Jwtpayload): Promise<{ message: string; email: string }> {
      return this.authService.resendVerificationEmail(user.userId);
    }
  }