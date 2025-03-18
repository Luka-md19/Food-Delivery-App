import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtSecretValidationException } from '../exceptions/jwt-secret-validation.exception';
import { LoggerFactory } from '../logger/logger.factory';

@Injectable()
export class AppConfigService {
  private readonly logger = LoggerFactory.getLogger('AppConfigService');

  constructor(private readonly configService: ConfigService) {}

  get<T = any>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue);
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get tcpPort(): number {
    return this.configService.get<number>('TCP_PORT', 3001);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get databaseConfig() {
    return this.configService.get('database');
  }

  get mongodbConfig() {
    return this.configService.get('mongodb');
  }

  /**
   * Validates that the JWT secret meets complexity requirements
   * @returns true if valid, throws an exception if invalid
   */
  validateJwtSecret(): boolean {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const requireComplexity = this.configService.get<string>('JWT_SECRET_COMPLEXITY_REQUIRED', 'true') === 'true';
    
    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not defined');
      throw new JwtSecretValidationException('JWT secret is required but not provided');
    }
    
    if (requireComplexity && jwtSecret.length < 32) {
      this.logger.error('JWT_SECRET does not meet minimum length requirement (32 characters)');
      throw new JwtSecretValidationException('JWT secret must be at least 32 characters long');
    }
    
    this.logger.log('JWT secret validation passed');
    return true;
  }

  /**
   * Validates MongoDB connection URI
   * @returns true if valid, throws an exception if invalid
   */
  validateMongoDBUri(): boolean {
    const mongoUri = this.configService.get<string>('MONGODB_URI');
    
    if (!mongoUri) {
      this.logger.error('MONGODB_URI is not defined');
      throw new Error('MongoDB URI is required but not provided');
    }
    
    // Basic validation for MongoDB URI format
    const uriPattern = /^mongodb(\+srv)?:\/\/.+/;
    if (!uriPattern.test(mongoUri)) {
      this.logger.error('MONGODB_URI format is invalid');
      throw new Error('MongoDB URI format is invalid');
    }
    
    this.logger.log('MongoDB URI validation passed');
    return true;
  }
}
