import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { SkipRateLimit } from '@app/common/rate-limiter';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Controller dedicated to load testing
 * Provides simplified endpoints that bypass normal auth flows
 * for high throughput load testing
 */
@ApiTags('Load Testing')
@Controller('load-test/auth')
export class LoadTestController {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Simplified authentication endpoint for load testing
   * Doesn't perform actual database operations or validation
   */
  @Post('login')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simplified login endpoint for load testing' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns mock user data and tokens',
    schema: {
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    const mockUser = {
      id: uuidv4(),
      email: loginDto.email,
      roles: ['CUSTOMER'],
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true
    };

    const accessToken = this.jwtService.sign({
      sub: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName
    });

    const refreshToken = this.jwtService.sign({
      sub: mockUser.id,
      tokenType: 'refresh'
    }, { expiresIn: '7d' });

    return {
      user: mockUser,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Simplified registration endpoint for load testing
   */
  @Post('register')
  @SkipRateLimit()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Simplified registration endpoint for load testing' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Returns mock user data and tokens for immediate login',
    schema: {
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    const mockUser = {
      id: uuidv4(),
      email: registerDto.email,
      roles: registerDto.roles || ['CUSTOMER'],
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      isEmailVerified: true
    };

    const accessToken = this.jwtService.sign({
      sub: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName
    });

    const refreshToken = this.jwtService.sign({
      sub: mockUser.id,
      tokenType: 'refresh'
    }, { expiresIn: '7d' });

    return {
      user: mockUser,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Simplified token refresh endpoint for load testing
   */
  @Post('refresh')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simplified token refresh endpoint for load testing' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: { type: 'string' }
      },
      required: ['refreshToken']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Returns new tokens',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' }
      }
    }
  })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, { ignoreExpiration: true });
      const userId = decoded.sub || uuidv4();
      
      const newAccessToken = this.jwtService.sign({
        sub: userId,
        roles: ['CUSTOMER'],
      });
      
      const newRefreshToken = this.jwtService.sign({
        sub: userId,
        tokenType: 'refresh'
      }, { expiresIn: '7d' });
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (e) {
      // If token is invalid, still return mock tokens for load testing
      const userId = uuidv4();
      
      const accessToken = this.jwtService.sign({
        sub: userId,
        roles: ['CUSTOMER'],
      });
      
      const newRefreshToken = this.jwtService.sign({
        sub: userId,
        tokenType: 'refresh'
      }, { expiresIn: '7d' });
      
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    }
  }

  /**
   * Simplified forgot password endpoint for load testing
   */
  @Post('forgot-password')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simplified forgot password endpoint for load testing' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Simulates password reset email sent',
    schema: {
      properties: {
        message: { type: 'string' }
      }
    }
  })
  async forgotPassword(@Body('email') email: string) {
    return {
      message: 'Password reset instructions have been sent to your email'
    };
  }

  /**
   * Simplified logout endpoint for load testing
   */
  @Post('logout')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simplified logout endpoint for load testing' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: { type: 'string' }
      },
      required: ['refreshToken']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Simulates successful logout',
    schema: {
      properties: {
        message: { type: 'string' }
      }
    }
  })
  async logout(
    @Body('refreshToken') refreshToken: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    // Always return success for load testing
    return {
      message: 'Logout successful'
    };
  }

  /**
   * Simple health check endpoint for load testing
   */
  @Get('health')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Simplified health check for load testing' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-10-12T15:21:20.123Z' }
      }
    }
  })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
} 