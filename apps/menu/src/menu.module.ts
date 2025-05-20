import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MenuController, CategoryController, MenuItemController, RestaurantController } from './controllers';
import { AdminController } from './controllers/admin.controller';
import { MenuService, CategoryService, MenuItemService, RestaurantService, AdminService } from './services';
import { CachedMenuService } from './services/cached-menu.service';
import { CachedCategoryService } from './services/cached-category.service';
import { CachedMenuItemService } from './services/cached-menu-item.service';
import { BypassCacheMiddleware } from './services/bypass-cache.middleware';

// Import common module features in organized groups
import { 
  // Configuration and fundamentals
  ConfigModule, 
  HealthModule, 
  LoggerModule, 
  LogLevel, 
  LogFormat, 
  LogTransport,
  
  // Database and data access
  MongoDBModule,
  
  // Messaging and communication
  MessagingModule,
  EventPublisher,
  IEventPublisher,
  
  // Error handling
  ErrorsModule,
  
  // Authentication and authorization
  ServiceAuthModule, 
  ServiceJwtStrategy, 
  ServiceTokenInterceptor,
  
  // Caching and Redis
  RedisModule,
  CacheModule,
  CacheService,
  TokenBlacklistService,
  
  // Rate limiting
  ThrottlerModule,
  DisabledThrottlerStorage,
  
  // Services
  AppConfigService, 
  ValidatorService, 
  ErrorHandlerService, 
  LoggerFactory,
  MongoDBService,
  
  // Worker threads
  WorkerThreadsModule,

  // Load testing utilities for Docker
  SimpleThrottlerConfig
} from '@app/common';
import { EVENT_PUBLISHER as CommonEventPublisher } from '@app/common/messaging/publishers';

import { JwtModule } from '@app/common/jwt';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { MenuRepository } from './repositories/menu/menu.repository';
import { CategoryRepository } from './repositories/category/category.repository';
import { MenuDomainRepository } from './domain/repositories/menu/menu-domain.repository';
import { MenuItemDomainRepository } from './domain/repositories/menu-item/menu-item-domain.repository';
import { CategoryDomainRepository } from './domain/repositories/category/category-domain.repository';
import { RestaurantDomainRepository } from './domain/repositories/restaurant/restaurant-domain.repository';
import { MenuAvailabilityService } from './domain/services/menu-availability.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventHandlers } from './events/handlers';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { FailedMessage, FailedMessageSchema } from './schemas/common';
import { Menu, MenuSchema } from './schemas/menu';
import { Category, CategorySchema } from './schemas/category';
import { MenuItem, MenuItemSchema } from './schemas/menu-item';
import { Restaurant, RestaurantSchema } from './schemas/restaurant';
import { FailedMessageRepository } from './repositories/common/failed-message.repository';
import { MenuHealthController } from './health/menu-health.controller';
import { FileStorageService, MessageRetryService } from './events/services';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CleanupService } from './services/cleanup.service';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { LoadTestController } from './controllers/load-test.controller';
// Import ThrottlerStorage from NestJS directly
import { ThrottlerStorage } from '@nestjs/throttler';

// Define a factory to create domain repositories
const domainRepositoryProviders = [
  {
    provide: 'IMenuDomainRepository',
    useClass: MenuDomainRepository,
  },
  {
    provide: 'ICategoryDomainRepository',
    useClass: CategoryDomainRepository,
  },
  {
    provide: 'IMenuItemDomainRepository',
    useClass: MenuItemDomainRepository,
  },
  {
    provide: 'IRestaurantDomainRepository',
    useClass: RestaurantDomainRepository,
  },
];

// Define a factory for infrastructure repositories
const infrastructureRepositoryProviders = [
  {
    provide: 'IMenuRepository',
    useClass: MenuRepository,
  },
  {
    provide: 'ICategoryRepository',
    useClass: CategoryRepository,
  },
  {
    provide: 'IMenuItemRepository',
    useClass: MenuRepository,
  },
  {
    provide: 'IFailedMessageRepository',
    useClass: FailedMessageRepository,
  },
];

@Module({
  imports: [
    // Config and logging
    ConfigModule.forRoot('menu'),
    LoggerModule.forRoot({
      appName: 'menu-service',
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.INFO,
      format: process.env.NODE_ENV === 'production' ? LogFormat.JSON : LogFormat.TEXT,
      transports: process.env.NODE_ENV === 'production' 
        ? [LogTransport.CONSOLE, LogTransport.DAILY_ROTATE_FILE] 
        : [LogTransport.CONSOLE],
      logDir: 'logs/menu',
    }),
    
    // Database
    MongoDBModule.forRoot('menu'),
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => {
        const mongoUri = configService.get('MONGODB_URI');
        const mongoDatabase = configService.get('MONGODB_DATABASE');
        
        if (!mongoUri) {
          throw new Error('MongoDB URI is required');
        }
        
        return {
          uri: mongoUri,
          dbName: mongoDatabase,
          ssl: true,
          tls: true,
          tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
          tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
          serverSelectionTimeoutMS: 60000,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 60000,
          autoIndex: true,
          autoCreate: true,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: FailedMessage.name, schema: FailedMessageSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: Category.name, schema: CategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurant.name, schema: RestaurantSchema }
    ]),
    
    // Cache and Redis
    RedisModule,
    CacheModule.register(),
    
    // Authentication
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ServiceAuthModule.register(),
    
    // Event handling and scheduling
    CqrsModule,
    MessagingModule.forRoot({
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
      successThreshold: 5
    }),
    ScheduleModule.forRoot(),
    
    // Health and error handling
    HealthModule.register({ 
      serviceName: 'menu-service',
      instanceId: `menu-${process.env.POD_NAME || process.env.HOSTNAME || uuidv4().substring(0, 8)}`,
    }),
    ErrorsModule,
    
    // Rate limiting - Using environment variable to toggle
    ...(process.env.ENABLE_RATE_LIMITING !== 'false' ? [
      // Standard rate limiting configuration when enabled (the default)
      ThrottlerModule.registerAsync({
        imports: [ConfigModule],
        useFactory: (configService: AppConfigService) => ({
          ttl: configService.get('THROTTLE_TTL', 60),
          limit: configService.get('THROTTLE_LIMIT', 100),
          storage: 'redis',
          microserviceName: 'menu-service',
          errorMessage: 'Too many requests from this IP, please try again later',
          excludeRoutes: ['/api/health'],
          keyPrefix: 'menu-throttler:',
          useGlobalGuard: true,
          useGlobalFilter: true,
          useGlobalInterceptor: true,
        }),
        inject: [AppConfigService],
      }),
    ] : [
      // Disabled rate limiting configuration when ENABLE_RATE_LIMITING=false
      ThrottlerModule.forRoot({
        ttl: 60,
        limit: 100000, // Very high limit
        storage: 'memory',
        microserviceName: 'menu-service', 
        errorMessage: 'Rate limiting disabled for testing',
        excludeRoutes: ['/health', '/load-test/*'],
        keyPrefix: 'menu-throttler:',
        useGlobalGuard: false,
        useGlobalFilter: true,
        useGlobalInterceptor: true,
        extraProviders: [
          {
            provide: ThrottlerStorage,
            useClass: DisabledThrottlerStorage,
          }
        ]
      }),
    ]),
    
    // Worker threads for CPU-intensive operations
    WorkerThreadsModule.register(),
    
    // Client modules for microservice communication
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        inject: [AppConfigService],
        useFactory: (configService: AppConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('AUTH_SERVICE_HOST', 'auth'),
            port: +configService.get('AUTH_SERVICE_PORT', 3001),
          },
        }),
      },
    ]),
  ],
  controllers: [
    // API controllers
    MenuController, 
    CategoryController, 
    MenuItemController, 
    RestaurantController, 
    AdminController,
    
    // Health controller
    MenuHealthController,
    
    // Load Test controller
    LoadTestController
  ],
  providers: [
    // Add the domain and infrastructure repository providers
    ...domainRepositoryProviders,
    ...infrastructureRepositoryProviders,
    ...EventHandlers,
    
    // Add the ServiceTokenInterceptor
    ServiceTokenInterceptor,
    
    // Health Check Providers
    {
      provide: 'SERVICE_NAME',
      useValue: 'menu-service'
    },
    {
      provide: 'INSTANCE_ID',
      useValue: `menu-${process.env.POD_NAME || process.env.HOSTNAME || uuidv4().substring(0, 8)}`
    },
    {
      provide: 'HOSTNAME',
      useValue: os.hostname()
    },
    {
      provide: 'HEALTH_PATH',
      useValue: 'health'
    },
    
    // Services
    JwtStrategy,
    ServiceJwtStrategy,
    MenuService,
    CategoryService,
    MenuItemService,
    RestaurantService,
    AdminService,
    CachedMenuService,
    CachedCategoryService,
    CachedMenuItemService,
    ValidatorService,
    AppConfigService,
    // Provide ErrorHandlerService with factory instead of direct class
    {
      provide: ErrorHandlerService,
      useFactory: () => new ErrorHandlerService('MenuModule')
    },
    
    // Domain services
    MenuAvailabilityService,
    
    // Event infrastructure
    {
      provide: 'IFileStorageService',
      useClass: FileStorageService,
    },
    {
      provide: MessageRetryService,
      useFactory: (failedMessageRepo, eventPublisher, fileStorageService, mongoDBService) => {
        return new MessageRetryService(failedMessageRepo, eventPublisher, fileStorageService, mongoDBService);
      },
      inject: [
        'IFailedMessageRepository',
        'IEventPublisher',
        'IFileStorageService',
        MongoDBService
      ]
    },
    FileStorageService,
    {
      provide: CommonEventPublisher,
      useExisting: EventPublisher,
    },
    // Add back the IEventPublisher provider
    {
      provide: 'IEventPublisher',
      useClass: EventPublisher,
    },
    // Add the IMessageRetryService provider
    {
      provide: 'IMessageRetryService',
      useExisting: MessageRetryService,
    },
    
    // Add the cleanup service
    CleanupService,
  ],
  exports: [
    MenuService,
    CategoryService,
    MenuItemService,
    RestaurantService,
    AdminService,
    CachedMenuService,
    CachedCategoryService,
    CachedMenuItemService
  ]
})
export class MenuModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply BypassCacheMiddleware to all routes that might use caching
    consumer
      .apply(BypassCacheMiddleware)
      .forRoutes(
        { path: '/api/menus', method: RequestMethod.GET },
        { path: '/api/menus/*', method: RequestMethod.GET },
        { path: '/api/categories', method: RequestMethod.GET },
        { path: '/api/categories/*', method: RequestMethod.GET },
        { path: '/api/menu-items', method: RequestMethod.GET },
        { path: '/api/menu-items/*', method: RequestMethod.GET },
        { path: '/api/restaurants/*/menus', method: RequestMethod.GET }
      );
  }
}