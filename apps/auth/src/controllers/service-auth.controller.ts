import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  UseGuards,
  Req,
  Get
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiResponse,
  ApiBody,
  getSchemaPath,
  ApiBearerAuth
} from '@nestjs/swagger';
import { ServiceAuthService } from '../auth/services/service-auth.service';
import { CachedAuthService } from '../auth/services/cached-auth.service';
import { ServiceTokenDto } from '../dto/service-token.dto';
import { JwtAuthGuard } from '@app/common/auth/guards';
import { ApiAuth, CurrentUser, Jwtpayload, UserRole } from '@app/common';
import { Roles } from '@app/common/auth/decorators';

/**
 * Controller responsible for service-to-service authentication
 * Provides endpoints for generating JWT tokens for inter-service communication
 */
@ApiTags('Service Authentication')
@Controller('auth/service')
export class ServiceAuthController {
  private readonly logger = new Logger(ServiceAuthController.name);

  constructor(private readonly serviceAuthService: ServiceAuthService) {}

  /**
   * Generate a service token for inter-service authentication
   * @param tokenRequest Service token request containing service identification and API key
   * @returns JWT token response with access token, expiry, and token type
   */
  @Post('token')
  @ApiOperation({ summary: 'Generate a service token using API key authentication' })
  @ApiResponse({
    status: 201,
    description: 'Service token generated successfully',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        expiresIn: {
          type: 'number',
          example: 3600,
        },
        tokenType: {
          type: 'string',
          example: 'Bearer',
        },
      },
    },
  })
  async generateServiceToken(@Body() serviceTokenDto: ServiceTokenDto) {
    return this.serviceAuthService.generateServiceToken(serviceTokenDto);
  }

  @Post('token/admin')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiAuth()
  @ApiOperation({ summary: 'Generate a service token using admin user authentication' })
  @ApiResponse({
    status: 201,
    description: 'Service token generated successfully',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        expiresIn: {
          type: 'number',
          example: 3600,
        },
        tokenType: {
          type: 'string',
          example: 'Bearer',
        },
      },
    },
  })
  async generateServiceTokenAsAdmin(
    @CurrentUser() user: Jwtpayload,
    @Body() serviceTokenDto: Omit<ServiceTokenDto, 'apiKey'>,
  ) {
    // Admin users can issue service tokens without API keys
    return this.serviceAuthService.issueServiceToken(
      serviceTokenDto.serviceId,
      serviceTokenDto.serviceName,
      serviceTokenDto.permissions,
    );
  }
}