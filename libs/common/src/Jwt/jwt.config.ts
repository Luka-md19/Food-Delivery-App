import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';
import { Logger } from '@nestjs/common';

// Create a logger for this module
const logger = new Logger('JwtConfig');

export const jwtConfig: JwtModuleAsyncOptions = {
  inject: [AppConfigService],
  useFactory: async (configService: AppConfigService) => {
    // Try multiple sources to get the JWT secret
    let jwtSecret = configService.get('JWT_SECRET');
    
    // If not found in configService, try environment directly
    if (!jwtSecret) {
      logger.warn('JWT_SECRET not found in ConfigService, trying direct environment access');
      jwtSecret = process.env.JWT_SECRET;
    }
    
    // Final check - if still no secret, throw an error to prevent startup with invalid configuration
    if (!jwtSecret) {
      logger.error('JWT_SECRET is missing - service will not be able to sign or verify tokens');
      throw new Error('JWT_SECRET environment variable must be set');
    }
    
    logger.log('JWT secret configuration validated successfully');
    
    // Convert string to boolean explicitly
    const complexityRequiredStr = configService.get('JWT_SECRET_COMPLEXITY_REQUIRED', 'false');
    const secretComplexityRequired = complexityRequiredStr.toLowerCase() === 'true';
    
    if (secretComplexityRequired && jwtSecret) {
      // Check if the secret has sufficient entropy (at least 32 characters and includes special chars)
      const hasMinimumLength = jwtSecret.length >= 32;
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(jwtSecret);
      
      if (!hasMinimumLength || !hasSpecialChars) {
        logger.warn(
          'WARNING: JWT_SECRET does not meet security requirements. ' +
          'It should be at least 32 characters long and include special characters.'
        );
      }
    }
    
    return {
      secret: jwtSecret,
      signOptions: { expiresIn: `${configService.get('JWT_EXPIRATION', '3600')}s` },
    };
  },
}; 