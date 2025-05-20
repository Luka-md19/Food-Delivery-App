import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Post,
  Body,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { SkipRateLimit } from '@app/common/rate-limiter';
import { SocialAuthService } from '../auth/services/social-auth.service';

@ApiTags('Social Authentication')
@Controller('auth/social')
export class SocialAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @SkipRateLimit()
  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google authentication page',
  })
  googleAuth() {
    // The auth guard will handle redirection to Google
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @SkipRateLimit()
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with token information',
  })
  async googleAuthCallback(@Req() req, @Res() res) {
    // The user is validated by the guard
    const user = req.user;
    const tokenResponse = await this.socialAuthService.validateGoogleUser(user);

    // Redirect to the frontend with token information
    // In a real-world application, you may redirect to a specific page 
    // that can extract the token from the URL and store it securely
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/social-callback?token=${tokenResponse.accessToken}&refreshToken=${tokenResponse.refreshToken}`;
    
    return res.redirect(redirectUrl);
  }

  @Post('google/token')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Authenticate with Google token (mobile app flow)' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
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
      },
    },
  })
  async googleToken(@Body() googleAuthDto: GoogleAuthDto) {
    // This endpoint is used when the client handles the OAuth flow (like mobile apps)
    // and sends the Google token ID to the backend for verification
    const user = {
      googleId: googleAuthDto.googleId,
      email: googleAuthDto.email,
      firstName: googleAuthDto.firstName,
      lastName: googleAuthDto.lastName,
    };
    
    return this.socialAuthService.validateGoogleUser(user);
  }
} 