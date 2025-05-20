import { DynamicModule, Module, Inject, Provider, Type } from '@nestjs/common';
import { THROTTLER_OPTIONS, THROTTLER_OPTIONS_FACTORY } from './constants/tokens';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitExceptionFilter } from './filters/rate-limit-exception.filter';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { RedisThrottlerStorage, MemoryThrottlerStorage, REDIS_THROTTLER_OPTIONS } from './storage';
import { ThrottlerStorage } from '@nestjs/throttler';
import { LoggerFactory } from '../logger/logger.factory';
import { ErrorsModule } from '../exceptions/errors.module';
import { DynamicRateLimiterGuard, CustomThrottlerGuard } from './guards';
import { DynamicRateLimiterService } from './services/dynamic-rate-limiter.service';
import { Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';

// Define the enum here instead of importing it
export enum ThrottlerStorageType {
  MEMORY = 'memory',
  REDIS = 'redis',
}

/**
 * Interface for throttler options factory
 */
export interface ThrottlerOptionsFactory {
  createThrottlerOptions(): Promise<ThrottlerModuleOptions> | ThrottlerModuleOptions;
}

/**
 * Interface for throttler module options
 */
export interface ThrottlerModuleOptions {
  /** The time-to-live for requests in storage in milliseconds. Defaults to 60000 (1 minute) */
  ttl?: number;
  
  /** The number of requests allowed within the TTL limit. Defaults to 10 */
  limit?: number;
  
  /** Error message shown in the response when rate-limited */
  errorMessage?: string;
  
  /** The storage implementation to use */
  storage?: ThrottlerStorage | 'memory' | 'redis';
  
  /** For backward compatibility */
  storageType?: ThrottlerStorageType;
  
  /** Microservice name for context */
  microserviceName?: string;
  
  /** Key prefix for throttler storage */
  keyPrefix?: string;
  
  /** Redis options when using Redis storage */
  redisOptions?: any;
  
  /** Whether to ignore a request based on the context */
  ignoreUserAgents?: RegExp[];
  
  /** Custom function to skip throttling based on the request */
  skipIf?: (context: any) => boolean | Promise<boolean>;
  
  /** Routes to exclude from throttling */
  excludeRoutes?: string[];
  
  /** Whether to use the global guard */
  useGlobalGuard?: boolean;
  
  /** Whether to use the global filter for rate limit exceptions */
  useGlobalFilter?: boolean;
  
  /** Whether to use the global interceptor for rate limit headers */
  useGlobalInterceptor?: boolean;
  
  /** Additional providers to register */
  extraProviders?: Provider[];
}

/**
 * Interface for asynchronous throttler module options
 */
export interface ThrottlerModuleAsyncOptions {
  /**
   * Modules to import
   */
  imports?: any[];
  
  /**
   * Factory function to create throttler options
   */
  useFactory?: (...args: any[]) => ThrottlerModuleOptions | Promise<ThrottlerModuleOptions>;
  
  /**
   * Dependencies to inject into factory function
   */
  inject?: any[];
  
  /**
   * Class that implements ThrottlerOptionsFactory
   */
  useClass?: Type<ThrottlerOptionsFactory>;
  
  /**
   * Existing provider that implements ThrottlerOptionsFactory
   */
  useExisting?: Type<ThrottlerOptionsFactory>;
  
  /**
   * Whether to use the global guard
   * @default true
   */
  useGlobalGuard?: boolean;
  
  /**
   * Whether to use the global filter for rate limit exceptions
   * @default true
   */
  useGlobalFilter?: boolean;
  
  /**
   * Whether to use the global interceptor for rate limit headers
   * @default true
   */
  useGlobalInterceptor?: boolean;
  
  /**
   * Additional providers to register
   */
  extraProviders?: Provider[];
  
  /**
   * Storage type to use
   */
  storage?: 'memory' | 'redis' | ThrottlerStorage;
  
  /**
   * Storage type enum
   */
  storageType?: ThrottlerStorageType;
}

// Alias for backward compatibility
export type ThrottlerAsyncOptions = ThrottlerModuleAsyncOptions;

/**
 * Enhanced throttler module with advanced configuration
 */
@Module({
  imports: [ErrorsModule],
  providers: [
    {
      provide: THROTTLER_OPTIONS,
      useValue: { ttl: 60, limit: 10 }
    },
    DynamicRateLimiterService,
    {
      provide: CustomThrottlerGuard,
      useFactory: (throttlerStorage, reflector) => {
        return new CustomThrottlerGuard(throttlerStorage, reflector);
      },
      inject: [ThrottlerStorage, Reflector]
    },
    {
      provide: ThrottlerStorage,
      useClass: MemoryThrottlerStorage,
    },
    {
      provide: DynamicRateLimiterGuard,
      useFactory: (options, storageService, rateLimiterService, reflector) => {
        return new DynamicRateLimiterGuard(storageService, reflector, rateLimiterService);
      },
      inject: [THROTTLER_OPTIONS, ThrottlerStorage, DynamicRateLimiterService, Reflector]
    },
    RateLimitExceptionFilter,
    {
      provide: RateLimitInterceptor,
      useFactory: (reflector, rateLimiterService, storageService, options) => {
        return new RateLimitInterceptor(
          reflector, 
          rateLimiterService, 
          storageService,
          options
        );
      },
      inject: [Reflector, DynamicRateLimiterService, ThrottlerStorage, THROTTLER_OPTIONS]
    }
  ],
  exports: [
    DynamicRateLimiterService,
    DynamicRateLimiterGuard, 
    CustomThrottlerGuard,
    RateLimitExceptionFilter, 
    RateLimitInterceptor,
    THROTTLER_OPTIONS,
    ThrottlerStorage
  ]
})
export class ThrottlerModule {
  private static readonly logger = LoggerFactory.getLogger('ThrottlerModule');

  /**
   * Register Throttler module with global configuration
   * @param options
   * @returns
   */
  static forRoot(options: ThrottlerModuleOptions = {}): DynamicModule {
    this.logger.log('Registering Throttler module');

    const processedOptions = this.createOptions(options);
    
    const imports: any[] = [];
    if (processedOptions.storage === 'redis' || processedOptions.storageType === ThrottlerStorageType.REDIS) {
      this.logger.log('Importing RedisModule for throttler storage');
      // Don't actually import RedisModule since it doesn't exist in this context
      // Just log the intention for debugging
    }

    return {
      global: true,
      module: ThrottlerModule,
      imports,
      providers: [
        {
          provide: THROTTLER_OPTIONS,
          useValue: processedOptions,
        },
        {
          provide: REDIS_THROTTLER_OPTIONS,
          useValue: {
            keyPrefix: processedOptions.keyPrefix || 'throttler:',
            ...(processedOptions.redisOptions || {}),
          },
        },
        {
          provide: ThrottlerStorage,
          useFactory: () => {
            if (processedOptions.storage === 'redis' || 
                processedOptions.storageType === ThrottlerStorageType.REDIS) {
              try {
                this.logger.log('Initializing Redis storage for rate limiting');
                return new RedisThrottlerStorage();
              } catch (error) {
                this.logger.warn('Failed to initialize Redis storage, falling back to memory storage', error);
                return new MemoryThrottlerStorage();
              }
            }
            
            this.logger.log('Initializing Memory storage for rate limiting');
            return new MemoryThrottlerStorage();
          },
        },
        ...this.createGuards(options),
        ...this.createServices(),
        ...this.createInterceptors(options),
        ...(options.extraProviders || []),
      ],
      exports: [
        THROTTLER_OPTIONS,
        ThrottlerStorage,
        ...this.getServicesToExport(),
      ],
    };
  }
  
  /**
   * Register the module with async options, allowing for dependency injection
   * @param options 
   * @returns DynamicModule
   */
  public static registerAsync(options: ThrottlerModuleAsyncOptions): DynamicModule {
    this.logger.log('Registering ThrottlerModule with async options');

    const asyncProviders = this.createAsyncProviders(options);
    
    const imports = [...(options.imports || [])];
    if (options.storage === 'redis' || options.storageType === ThrottlerStorageType.REDIS) {
      this.logger.log('Importing RedisModule for throttler storage');
      // Don't actually import RedisModule since it doesn't exist in this context
    }

    return {
      global: true,
      module: ThrottlerModule,
      imports,
      providers: [
        ...asyncProviders,
        {
          provide: REDIS_THROTTLER_OPTIONS,
          useFactory: (throttlerOptions: ThrottlerModuleOptions) => ({
            keyPrefix: throttlerOptions.keyPrefix || 'throttler:',
            ...(throttlerOptions.redisOptions || {}),
          }),
          inject: [THROTTLER_OPTIONS],
        },
        {
          provide: ThrottlerStorage,
          useFactory: (throttlerOptions: ThrottlerModuleOptions) => {
            if (throttlerOptions.storage === 'redis' || 
                throttlerOptions.storageType === ThrottlerStorageType.REDIS) {
              try {
                this.logger.log('Initializing Redis storage for rate limiting');
                return new RedisThrottlerStorage();
              } catch (error) {
                this.logger.warn('Failed to initialize Redis storage, falling back to memory storage', error);
                return new MemoryThrottlerStorage();
              }
            }
            
            this.logger.log('Initializing Memory storage for rate limiting');
            return new MemoryThrottlerStorage();
          },
          inject: [THROTTLER_OPTIONS],
        },
        ...this.createGuards(options),
        ...this.createServices(),
        ...this.createInterceptors(options),
        ...(options.extraProviders || []),
      ],
      exports: [
        THROTTLER_OPTIONS,
        ThrottlerStorage,
        ...this.getServicesToExport(),
      ],
    };
  }

  /**
   * Create async providers based on module options
   * @param options 
   * @returns Provider[]
   */
  private static createAsyncProviders(options: ThrottlerModuleAsyncOptions): Provider[] {
    const providers: Provider[] = [];
    
    // If useFactory is provided, use it directly
    if (options.useFactory) {
      providers.push({
        provide: THROTTLER_OPTIONS,
        useFactory: async (...args: any[]) => {
          const factoryOptions = await options.useFactory(...args);
          return this.createOptions(factoryOptions);
        },
        inject: options.inject || [],
      });
    } 
    // If useExisting or useClass are provided, add the appropriate providers
    else if (options.useExisting || options.useClass) {
      // If useClass is provided but not useExisting, register the class
      if (options.useClass && !options.useExisting) {
        providers.push({
          provide: options.useClass,
          useClass: options.useClass,
        });
      }
      
      // Create the options provider using the factory pattern
      providers.push({
        provide: THROTTLER_OPTIONS,
        useFactory: async (optionsFactory: ThrottlerOptionsFactory) => {
          const factoryOptions = await optionsFactory.createThrottlerOptions();
          return this.createOptions(factoryOptions);
        },
        inject: [options.useExisting || options.useClass],
      });
    }
    
    return providers;
  }

  /**
   * Process the throttler module options
   * @param options ThrottlerModuleOptions
   * @returns ThrottlerModuleOptions
   */
  private static createOptions(options: ThrottlerModuleOptions): ThrottlerModuleOptions {
    if (!options) {
      options = {};
    }

    const processedOptions: ThrottlerModuleOptions = {
      ttl: options.ttl ?? 60,
      limit: options.limit ?? 10,
      microserviceName: options.microserviceName,
      storage: options.storage,
      storageType: options.storageType,
      errorMessage: options.errorMessage,
      ignoreUserAgents: options.ignoreUserAgents,
      excludeRoutes: options.excludeRoutes ?? [],
      keyPrefix: options.keyPrefix ?? 'throttler',
      redisOptions: options.redisOptions,
      useGlobalGuard: options.useGlobalGuard ?? true,
      useGlobalFilter: options.useGlobalFilter ?? true,
      useGlobalInterceptor: options.useGlobalInterceptor ?? true,
      skipIf: options.skipIf
    };

    // Configure storage
    if (!processedOptions.storage && !processedOptions.storageType) {
      this.logger.log('No storage provided, using memory storage');
      processedOptions.storageType = ThrottlerStorageType.MEMORY;
    } else if (processedOptions.storage === 'redis' || processedOptions.storageType === ThrottlerStorageType.REDIS) {
      this.logger.log('Using Redis storage for rate limiting');
      processedOptions.storageType = ThrottlerStorageType.REDIS;
    } else {
      this.logger.log('Using custom storage for rate limiting');
    }

    return processedOptions;
  }
  
  /**
   * Create the guards needed for the throttler module
   * @returns Array of guard providers
   */
  private static createGuards(options?: ThrottlerModuleOptions | ThrottlerModuleAsyncOptions): Provider[] {
    const useGlobalGuard = options?.useGlobalGuard ?? true;
    const useGlobalFilter = options?.useGlobalFilter ?? true;
    
    const providers: Provider[] = [];
    
    if (useGlobalGuard) {
      providers.push({
        provide: APP_GUARD,
        useFactory: (
          throttlerOptions: ThrottlerModuleOptions,
          throttlerStorage: ThrottlerStorage,
          dynamicRateLimiterService: DynamicRateLimiterService,
          reflector: Reflector,
        ) => {
          try {
            const guard = new DynamicRateLimiterGuard(
              throttlerStorage,
              reflector,
              dynamicRateLimiterService,
            );
            
            if (throttlerOptions?.microserviceName) {
              guard.setMicroserviceContext(throttlerOptions.microserviceName);
            }
            
            return guard;
          } catch (error) {
            this.logger.warn(`Error creating DynamicRateLimiterGuard, using fallback`);
            return new CustomThrottlerGuard(throttlerStorage, reflector);
          }
        },
        inject: [THROTTLER_OPTIONS, ThrottlerStorage, DynamicRateLimiterService, Reflector],
      });
    }
    
    if (useGlobalFilter) {
      providers.push({
        provide: APP_FILTER,
        useClass: RateLimitExceptionFilter,
      });
    }
    
    return providers;
  }
  
  /**
   * Create the interceptors needed for the throttler module
   * @returns Array of interceptor providers
   */
  private static createInterceptors(options?: ThrottlerModuleOptions | ThrottlerModuleAsyncOptions): Provider[] {
    const useGlobalInterceptor = options?.useGlobalInterceptor ?? true;
    
    const providers: Provider[] = [];
    
    if (useGlobalInterceptor) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useFactory: (
          reflector: Reflector,
          dynamicRateLimiterService: DynamicRateLimiterService,
          throttlerStorage: ThrottlerStorage,
          throttlerOptions: ThrottlerModuleOptions,
        ) => {
          const interceptor = new RateLimitInterceptor(
            reflector,
            dynamicRateLimiterService,
            throttlerStorage,
            throttlerOptions
          );
          
          if (throttlerOptions?.microserviceName) {
            interceptor.setMicroserviceContext(throttlerOptions.microserviceName);
          }
          
          return interceptor;
        },
        inject: [Reflector, DynamicRateLimiterService, ThrottlerStorage, THROTTLER_OPTIONS],
      });
    }
    
    return providers;
  }

  /**
   * Create the services needed for the throttler module
   * @returns Array of service providers
   */
  private static createServices(): Provider[] {
    return [
      {
        provide: DynamicRateLimiterService,
        useClass: DynamicRateLimiterService,
      },
      {
        provide: MemoryThrottlerStorage,
        useClass: MemoryThrottlerStorage,
      },
      {
        provide: RedisThrottlerStorage,
        useClass: RedisThrottlerStorage,
      },
    ];
  }

  /**
   * Return services to export from the module
   * @returns Array of Providers to export
   */
  private static getServicesToExport(): Array<Provider | string | symbol> {
    return [
      THROTTLER_OPTIONS,
      DynamicRateLimiterService,
      MemoryThrottlerStorage,
      RedisThrottlerStorage,
      DynamicRateLimiterGuard,
      CustomThrottlerGuard,
      RateLimitInterceptor
    ];
  }
}
