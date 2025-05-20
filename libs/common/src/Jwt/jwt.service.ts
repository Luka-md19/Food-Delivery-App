import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { JwtService as NestJwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';
import * as crypto from 'crypto';
import { CacheService } from '../redis/cache.service';
import { ThreadPoolService } from '../worker-threads/thread-pool.service';
import { LRUCache } from 'lru-cache';

/**
 * Interface for JWT keys with metadata for rotation
 */
export interface JwtKey {
  /** The key identifier */
  kid: string;
  /** The actual secret key */
  secret: string;
  /** When this key was created */
  createdAt: Date;
  /** Whether this is the current primary key for signing */
  isPrimary: boolean;
}

/**
 * Enhanced JWT service that supports key rotation
 * This service extends the NestJS JwtService to add support for key rotation
 * while maintaining compatibility with existing code
 */
@Injectable()
export class JwtService extends NestJwtService {
  protected readonly extLogger = new Logger(JwtService.name);
  private keys: JwtKey[] = [];
  private primaryKey: JwtKey | null = null;
  
  // Key rotation configuration
  private readonly keyRotationEnabled: boolean;
  private readonly keyRotationInterval: number; // in days
  private readonly maxKeyAge: number; // in days
  private keyRotationTimer: NodeJS.Timeout | null = null;
  private lastRotation: Date = new Date();
  
  // Caching configuration
  private readonly jwtVerifyCache: LRUCache<string, any>;
  private readonly useRedisCache: boolean;
  private readonly useThreadPool: boolean;
  private readonly verifyTtlSeconds: number = 60; // 1 minute default cache TTL
  private readonly memCacheTtl: number = 10000; // 10 seconds for memory cache (shorter than Redis)
  private readonly memCacheMax: number = 1000; // Maximum items in memory cache

  constructor(
    @Inject(NestJwtService) private readonly nestJwtService: NestJwtService,
    private readonly configService: AppConfigService,
    @Optional() private readonly cacheService?: CacheService,
    @Optional() private readonly threadPoolService?: ThreadPoolService,
  ) {
    super();
    
    // Security-conscious logging
    this.extLogger.log('JWT Service initialization starting...');
    
    // Only check if JWT_SECRET exists, not its content
    const jwtSecretExists = !!this.configService.get('JWT_SECRET');
    this.extLogger.log(`JWT security configuration: ${jwtSecretExists ? 'OK' : 'Incomplete'}`);
    
    // Load configuration from environment
    const rotationEnabled = this.configService.get('JWT_KEY_ROTATION_ENABLED', 'false') as string;
    this.keyRotationEnabled = rotationEnabled === 'true';
    this.keyRotationInterval = parseInt(this.configService.get('JWT_KEY_ROTATION_INTERVAL_DAYS', '30'), 10);
    this.maxKeyAge = parseInt(this.configService.get('JWT_MAX_KEY_AGE_DAYS', '90'), 10);
    
    // Cache configuration
    this.useRedisCache = !!this.cacheService;
    this.useThreadPool = !!this.threadPoolService;
    this.verifyTtlSeconds = parseInt(this.configService.get('JWT_VERIFY_CACHE_TTL', '60'), 10);
    
    // Create in-memory LRU cache for JWT verification
    this.jwtVerifyCache = new LRUCache({
      max: this.memCacheMax,
      ttl: this.memCacheTtl,
      updateAgeOnGet: true,
      allowStale: false,
    });
    
    this.extLogger.log(`Key rotation config: enabled=${this.keyRotationEnabled}, interval=${this.keyRotationInterval} days, maxAge=${this.maxKeyAge} days`);
    this.extLogger.log(`Caching config: memory=${true}, redis=${this.useRedisCache}, threadPool=${this.useThreadPool}`);
    
    // Initialize keys
    this.initializeKeys();
    
    // Set up key rotation if enabled
    if (this.keyRotationEnabled) {
      this.scheduleKeyRotation();
    }
  }

  /**
   * Initialize JWT keys - creates the initial key if none exists
   */
  private initializeKeys(): void {
    try {
      // Get base secret from config service using the explicit loader
      let baseSecret = '';
      try {
        baseSecret = this.configService.loadJwtSecret();
        this.extLogger.log('JWT security configuration loaded successfully');
      } catch (e) {
        // Fall back to standard get method
        this.extLogger.warn(`JWT configuration issue: ${e.message}, trying alternate methods`);
        baseSecret = this.configService.get('JWT_SECRET');
      }

      // Additional fallback to direct environment access as last resort
      if (!baseSecret) {
        this.extLogger.warn('Using fallback method for JWT configuration');
        baseSecret = process.env.JWT_SECRET;
      }

      if (!baseSecret) {
        this.extLogger.error('JWT_SECRET environment variable is missing');
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      if (baseSecret.trim() === '') {
        this.extLogger.error('JWT_SECRET environment variable is empty');
        throw new Error('JWT_SECRET cannot be empty');
      }

      // Create initial primary key
      const initialKey: JwtKey = {
        kid: crypto.randomUUID(),
        secret: baseSecret,
        createdAt: new Date(),
        isPrimary: true
      };
      
      this.keys = [initialKey];
      this.primaryKey = initialKey;
      this.lastRotation = new Date();
      
      this.extLogger.log(`JWT key rotation initialized with key ID: ${initialKey.kid}`);
    } catch (error) {
      this.extLogger.error(`Failed to initialize JWT keys: ${error.message}`);
      // This error is critical and will cause the service to fail
      throw error;
    }
  }

  /**
   * Schedule key rotation based on configured interval
   */
  private scheduleKeyRotation(): void {
    // Use a shorter interval for the scheduler to avoid 32-bit integer overflow
    // Check if it's time to rotate in each interval
    const dayInMs = 24 * 60 * 60 * 1000;
    const checkIntervalMs = Math.min(dayInMs, 2147483647); // Max 32-bit signed int (roughly 24.8 days)
    
    this.extLogger.log(`Scheduling JWT key rotation every ${this.keyRotationInterval} days`);
    
    this.keyRotationTimer = setInterval(() => {
      const now = new Date();
      const daysSinceLastRotation = (now.getTime() - this.lastRotation.getTime()) / dayInMs;
      
      if (daysSinceLastRotation >= this.keyRotationInterval) {
        this.rotateKeys();
      }
    }, checkIntervalMs);
    
    // Also perform cleanup of old keys
    this.cleanupOldKeys();
  }

  /**
   * Create a new key and set it as primary, demoting the current primary key
   */
  private rotateKeys(): void {
    try {
      this.extLogger.log('Performing JWT key rotation');
      
      // Demote current primary key
      if (this.primaryKey) {
        this.primaryKey.isPrimary = false;
      }
      
      // Create new primary key
      const baseSecret = this.configService.get('JWT_SECRET');
      const rotationSalt = crypto.randomBytes(16).toString('hex');
      const newSecret = crypto.createHmac('sha256', baseSecret)
        .update(rotationSalt)
        .digest('hex');
      
      const newKey: JwtKey = {
        kid: crypto.randomUUID(),
        secret: newSecret,
        createdAt: new Date(),
        isPrimary: true
      };
      
      // Add new key to keys array
      this.keys.push(newKey);
      this.primaryKey = newKey;
      this.lastRotation = new Date();
      
      // Clear all caches on key rotation
      this.clearCache();
      
      this.extLogger.log(`JWT key rotation completed, new primary key ID: ${newKey.kid}`);
      
      // Clean up old keys
      this.cleanupOldKeys();
    } catch (error) {
      this.extLogger.error(`Failed to rotate JWT keys: ${error.message}`, error.stack);
    }
  }

  /**
   * Remove keys older than maxKeyAge
   */
  private cleanupOldKeys(): void {
    try {
      const now = new Date();
      const maxAgeMs = this.maxKeyAge * 24 * 60 * 60 * 1000;
      
      // Filter out old keys
      const oldKeysCount = this.keys.filter(key => !key.isPrimary && 
        (now.getTime() - key.createdAt.getTime() > maxAgeMs)).length;
      
      if (oldKeysCount > 0) {
        this.keys = this.keys.filter(key => 
          key.isPrimary || (now.getTime() - key.createdAt.getTime() <= maxAgeMs)
        );
        
        this.extLogger.log(`Cleaned up ${oldKeysCount} old JWT keys`);
      }
    } catch (error) {
      this.extLogger.error(`Failed to clean up old JWT keys: ${error.message}`, error.stack);
    }
  }

  /**
   * Clear JWT verification caches
   */
  private clearCache(): void {
    // Clear in-memory cache
    this.jwtVerifyCache.clear();
    
    // Clear Redis cache if available
    if (this.useRedisCache && this.cacheService) {
      this.cacheService.keys('jwt:verify:*')
        .then(keys => {
          if (keys.length > 0) {
            this.extLogger.log(`Clearing ${keys.length} Redis cached JWT verifications`);
            return Promise.all(keys.map(key => this.cacheService?.delete(key)));
          }
        })
        .catch(err => {
          this.extLogger.error(`Failed to clear Redis JWT cache: ${err.message}`, err.stack);
        });
    }
  }

  /**
   * Create a hash of the token for cache keys
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sign a JWT token with the current primary key
   * Uses worker threads pool if available
   */
  override sign(payload: string | object | Buffer, options?: JwtSignOptions): string {
    try {
      if (!this.primaryKey) {
        throw new Error('No primary JWT key available for signing');
      }
      
      // Add key ID to the JWT header
      const signOptions: JwtSignOptions = {
        ...options,
        keyid: this.primaryKey.kid,
        secret: this.primaryKey.secret,
      };
      
      // Note: We can't use the ThreadPoolService for signing in the synchronous sign method
      // due to TypeScript's type constraints. An async version is provided separately.
      
      // Use appropriate overload based on payload type
      if (typeof payload === 'string') {
        return this.nestJwtService.sign(payload, signOptions);
      } else {
        return this.nestJwtService.sign(payload as object | Buffer, signOptions);
      }
    } catch (error) {
      this.extLogger.error(`JWT signing error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Asynchronous version of sign that can use the thread pool
   */
  async signAsync(payload: string | object | Buffer, options?: JwtSignOptions): Promise<string> {
    try {
      if (!this.primaryKey) {
        throw new Error('No primary JWT key available for signing');
      }
      
      // Add key ID to the JWT header
      const signOptions: JwtSignOptions = {
        ...options,
        keyid: this.primaryKey.kid,
      };
      
      // Use thread pool if available
      if (this.useThreadPool && this.threadPoolService) {
        // Ensure payload is an object for the thread pool service
        const payloadObject = typeof payload === 'string' || Buffer.isBuffer(payload) 
          ? { data: payload } 
          : payload as object;
        
        return await this.threadPoolService.signJwt(payloadObject, this.primaryKey.secret, signOptions);
      }
      
      // Fall back to default implementation
      if (typeof payload === 'string') {
        return this.nestJwtService.sign(payload, {
          ...signOptions,
          secret: this.primaryKey.secret,
        });
      } else {
        return this.nestJwtService.sign(payload as object | Buffer, {
          ...signOptions,
          secret: this.primaryKey.secret,
        });
      }
    } catch (error) {
      this.extLogger.error(`JWT signing error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify a JWT token
   * Uses multi-level caching
   */
  override verify<T extends object = any>(token: string, options?: JwtVerifyOptions): T {
    try {
      // Generate cache key
      const tokenHash = this.hashToken(token);
      const optionsHash = options ? this.hashToken(JSON.stringify(options)) : '';
      const cacheKey = `jwt:verify:${tokenHash}${optionsHash ? `:${optionsHash}` : ''}`;
      
      // Check in-memory cache first (fastest)
      const memCached = this.jwtVerifyCache.get(cacheKey);
      if (memCached) {
        this.extLogger.debug('JWT verification from memory cache');
        return memCached as T;
      }
      
      // Perform synchronous verification (NestJWT original verify is synchronous)
      const result = this.verifyTokenSync<T>(token, options);
      
      // Store in memory cache
      this.jwtVerifyCache.set(cacheKey, result);
      
      // Store in Redis asynchronously if available (don't await)
      if (this.useRedisCache && this.cacheService) {
        this.cacheService.set(cacheKey, result, this.verifyTtlSeconds)
          .catch(err => {
            this.extLogger.error(`Failed to store JWT verification in Redis: ${err.message}`);
          });
      }
      
      return result;
    } catch (error) {
      this.extLogger.debug(`JWT verification error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Internal method to verify the token synchronously
   */
  private verifyTokenSync<T extends object>(token: string, options?: JwtVerifyOptions): T {
    // Extract key ID from header if present
    let kid: string | undefined;
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      kid = header.kid;
    } catch (error) {
      this.extLogger.debug(`Failed to extract key ID from token: ${error.message}`);
    }
    
    // Find the key to use for verification
    let secret: string;
    if (kid) {
      // Find key by ID
      const key = this.keys.find(k => k.kid === kid);
      if (!key) {
        throw new Error(`JWT key with ID ${kid} not found`);
      }
      secret = key.secret;
    } else {
      // No key ID, try all keys starting with primary
      if (!this.primaryKey) {
        throw new Error('No JWT keys available for verification');
      }
      secret = this.primaryKey.secret;
    }
    
    // Use nestJwtService for synchronized verification
    return this.nestJwtService.verify<T>(token, {
      ...options,
      secret,
    });
  }
  
  /**
   * Asynchronous version of verify that can use the worker pool
   * This is not part of the standard interface but can be used
   * when performance is critical
   */
  async verifyAsync<T extends object>(token: string, options?: JwtVerifyOptions): Promise<T> {
    try {
      // Generate cache key
      const tokenHash = this.hashToken(token);
      const optionsHash = options ? this.hashToken(JSON.stringify(options)) : '';
      const cacheKey = `jwt:verify:${tokenHash}${optionsHash ? `:${optionsHash}` : ''}`;
      
      // Check in-memory cache first (fastest)
      const memCached = this.jwtVerifyCache.get(cacheKey);
      if (memCached) {
        this.extLogger.debug('JWT verification from memory cache');
        return memCached as T;
      }
      
      // Check Redis cache if available
      if (this.useRedisCache && this.cacheService) {
        return await this.cacheService.getOrSet<T>(
          cacheKey,
          async () => {
            // Cache miss - verify token
            const verified = await this.verifyTokenAsync<T>(token, options);
            
            // Also set in memory cache
            this.jwtVerifyCache.set(cacheKey, verified);
            
            return verified;
          },
          this.verifyTtlSeconds
        );
      }
      
      // No Redis cache - verify and store in memory only
      const verified = await this.verifyTokenAsync<T>(token, options);
      this.jwtVerifyCache.set(cacheKey, verified);
      return verified;
    } catch (error) {
      this.extLogger.debug(`JWT verification error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Internal method to verify the token with worker threads
   */
  private async verifyTokenAsync<T extends object>(token: string, options?: JwtVerifyOptions): Promise<T> {
    // Extract key ID from header if present
    let kid: string | undefined;
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      kid = header.kid;
    } catch (error) {
      this.extLogger.debug(`Failed to extract key ID from token: ${error.message}`);
    }
    
    // Find the key to use for verification
    let secret: string;
    if (kid) {
      // Find key by ID
      const key = this.keys.find(k => k.kid === kid);
      if (!key) {
        throw new Error(`JWT key with ID ${kid} not found`);
      }
      secret = key.secret;
    } else {
      // No key ID, try all keys starting with primary
      if (!this.primaryKey) {
        throw new Error('No JWT keys available for verification');
      }
      secret = this.primaryKey.secret;
    }
    
    // Use thread pool if available
    if (this.useThreadPool && this.threadPoolService) {
      return await this.threadPoolService.verifyJwt<T>(token, secret, options);
    }
    
    // Fall back to default implementation
    return this.nestJwtService.verify<T>(token, {
      ...options,
      secret,
    });
  }

  /**
   * Clean up when module is destroyed
   */
  onApplicationShutdown(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = null;
    }
  }
} 