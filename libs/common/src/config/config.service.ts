import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtSecretValidationException } from '../exceptions/jwt-secret-validation.exception';
import { LoggerFactory } from '../logger/logger.factory';

@Injectable()
export class AppConfigService {
  private readonly logger = LoggerFactory.getLogger('AppConfigService');
  private readonly sensitiveVarPatterns = [
    'JWT_SECRET', 'JWT_PRIVATE_KEY', 'DIRECT_JWT_SECRET', 
    'DATABASE_PASSWORD', 'MONGODB_PASSWORD', 'REDIS_PASSWORD',
    'SERVICE_API_KEY', 'SERVICE_API_KEYS', 'GOOGLE_CLIENT_SECRET',
    'EMAIL_PASSWORD'
  ];

  constructor(private readonly configService: ConfigService) {}

  get<T = any>(key: string, defaultValue?: T): T {
    // Special handling for critical configuration values
    if (key === 'JWT_SECRET') {
      const value = this.configService.get<T>(key, defaultValue);
      this.logger.log(`JWT_SECRET configuration check: ${value ? 'Available' : 'Not available'}`);
      
      if (!value && process.env.JWT_SECRET) {
        this.logger.warn('JWT_SECRET found in process.env but not loaded by ConfigService');
        return process.env.JWT_SECRET as unknown as T;
      }
      
      return value;
    }
    
    // Get value from ConfigService (this will follow the hierarchy of env files)
    const value = this.configService.get<T>(key, defaultValue);
    
    // Check if variable contains sensitive information by pattern matching
    // This will catch both exact matches and prefixed vars like AUTH_DATABASE_PASSWORD
    if (this.isSensitiveVariable(key)) {
      this.logger.debug(`Accessed sensitive config: ${key} (value hidden)`);
    } else if (process.env.NODE_ENV !== 'production') {
      // Only log non-sensitive values in development
      this.logger.debug(`Config: ${key} = ${value || defaultValue || 'undefined'}`);
    }
    
    return value;
  }

  /**
   * Check if a configuration key contains sensitive information
   */
  private isSensitiveVariable(key: string): boolean {
    // Direct match with known sensitive vars
    if (this.sensitiveVarPatterns.includes(key)) {
      return true;
    }
    
    // Check for prefixed sensitive vars (like AUTH_DATABASE_PASSWORD)
    for (const pattern of this.sensitiveVarPatterns) {
      // Check if key ends with the sensitive pattern
      if (key.endsWith(pattern)) {
        return true;
      }
      
      // Check if key contains the sensitive pattern in the middle
      const parts = key.split('_');
      if (parts.length > 2) {
        // Join all parts except the first one and check if it's a sensitive pattern
        const withoutPrefix = parts.slice(1).join('_');
        if (this.sensitiveVarPatterns.includes(withoutPrefix)) {
          return true;
        }
      }
    }
    
    return false;
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

  /**
   * Explicitly load and validate the JWT secret from environment variables
   * to ensure it's available for signing tokens
   */
  loadJwtSecret(): string {
    let jwtSecret = this.configService.get<string>('JWT_SECRET');
    
    if (!jwtSecret) {
      this.logger.warn('JWT_SECRET not found in configuration, attempting fallback');
      jwtSecret = process.env.JWT_SECRET;
    }
    
    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not defined in any environment source');
      throw new Error('JWT_SECRET is required but not provided');
    }
    
    if (jwtSecret.length < 32) {
      this.logger.warn('JWT_SECRET does not meet minimum length requirement');
    }
    
    return jwtSecret;
  }
}
