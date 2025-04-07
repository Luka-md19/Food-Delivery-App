import { Module, forwardRef } from '@nestjs/common';
import { MenuController, CategoryController, MenuItemController, RestaurantController } from './controllers';
import { AdminController } from './controllers/admin.controller';
import { MenuService, CategoryService, MenuItemService, RestaurantService, AdminService } from './services';
import { MongoDBModule } from '@app/common/database/mongodb';
import { ConfigModule, HealthModule } from '@app/common';
import { MenuRepository } from './repositories/menu/menu.repository';
import { CategoryRepository } from './repositories/category/category.repository';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { MenuDomainRepository } from './domain/repositories/menu/menu-domain.repository';
import { MenuItemDomainRepository } from './domain/repositories/menu-item/menu-item-domain.repository';
import { CategoryDomainRepository } from './domain/repositories/category/category-domain.repository';
import { RestaurantDomainRepository } from './domain/repositories/restaurant/restaurant-domain.repository';
import { MenuAvailabilityService } from './domain/services/menu-availability.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventHandlers } from './events/handlers';
import { EventPublisher } from './events/publishers/event-publisher';
import { AppConfigService } from '@app/common';
import { ThrottlerModule, ThrottlerStorageType } from '@app/common/rate-limiter';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { FailedMessage, FailedMessageSchema } from './schemas/common';
import { Menu, MenuSchema } from './schemas/menu';
import { Category, CategorySchema } from './schemas/category';
import { MenuItem, MenuItemSchema } from './schemas/menu-item';
import { Restaurant, RestaurantSchema } from './schemas/restaurant';
import { FailedMessageRepository } from './repositories/common/failed-message.repository';
import { MessageRetryService } from './events/services';
import { FileStorageService } from './events/services/file-storage/file-storage.service';
import { MenuHealthController } from './health/menu-health.controller';
import { MessagingModule } from '@app/common/messaging';
import { MongoDBService } from '@app/common/database/mongodb/mongodb.service';
import { LoggerModule, LogLevel, LogFormat, LogTransport } from '@app/common/logger';
import { ErrorsModule } from '@app/common/exceptions';
import { ErrorHandlerService, ValidatorService } from '@app/common/exceptions';
import * as mongoose from 'mongoose';

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
    provide: 'IFailedMessageRepository',
    useClass: FailedMessageRepository,
  },
];

@Module({
  imports: [
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
    MongoDBModule.forRoot('menu'),
    MessagingModule,
    CqrsModule,
    ScheduleModule.forRoot(),
    HealthModule.register({ serviceName: 'menu-service' }),
    ErrorsModule,
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
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
      storageType: ThrottlerStorageType.REDIS,
      errorMessage: 'Too many requests from this IP, please try again later',
      excludePaths: ['/api/health'],
      useGlobalGuard: true,
      useGlobalFilter: true,
      useGlobalInterceptor: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        useFactory: (configService: AppConfigService) => {
          const useDocker = configService.get<string>('USE_DOCKER', 'false');
          const isDocker = useDocker === 'true';
          const rabbitmqUrl = configService.get(
            'RABBITMQ_URL',
            isDocker ? 'amqp://rabbitmq:5672' : 'amqp://localhost:5672'
          );
          const rabbitmqQueue = configService.get('RABBITMQ_QUEUE', 'menu_events');

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue: rabbitmqQueue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
        inject: [AppConfigService],
      },
    ]),
  ],
  controllers: [MenuController, MenuHealthController, CategoryController, MenuItemController, RestaurantController, AdminController],
  providers: [
    // Services
    {
      provide: MenuService,
      useFactory: (menuDomainRepo, categoryDomainRepo, errorHandler, validator) => {
        return new MenuService(menuDomainRepo, categoryDomainRepo, errorHandler, validator);
      },
      inject: [
        'IMenuDomainRepository',
        'ICategoryDomainRepository',
        ErrorHandlerService,
        ValidatorService
      ]
    },
    {
      provide: CategoryService,
      useFactory: (categoryDomainRepo, menuDomainRepo, menuItemDomainRepo, menuService, errorHandler, validator, eventBus) => {
        return new CategoryService(categoryDomainRepo, menuDomainRepo, menuItemDomainRepo, menuService, errorHandler, validator, eventBus);
      },
      inject: [
        'ICategoryDomainRepository',
        'IMenuDomainRepository',
        'IMenuItemDomainRepository',
        MenuService,
        ErrorHandlerService,
        ValidatorService,
        EventBus
      ]
    },
    {
      provide: MenuItemService,
      useFactory: (menuItemDomainRepo, categoryDomainRepo, errorHandler, validator, eventBus) => {
        return new MenuItemService(menuItemDomainRepo, categoryDomainRepo, errorHandler, validator, eventBus);
      },
      inject: [
        'IMenuItemDomainRepository',
        'ICategoryDomainRepository',
        ErrorHandlerService,
        ValidatorService,
        EventBus
      ]
    },
    {
      provide: RestaurantService,
      useFactory: (restaurantDomainRepo, errorHandler, validator, eventBus) => {
        return new RestaurantService(restaurantDomainRepo, errorHandler, validator, eventBus);
      },
      inject: [
        'IRestaurantDomainRepository',
        ErrorHandlerService,
        ValidatorService,
        EventBus
      ]
    },
    {
      provide: AdminService,
      useFactory: (failedMessageRepo, messageRetryService) => {
        return new AdminService(failedMessageRepo, messageRetryService);
      },
      inject: [
        'IFailedMessageRepository',
        'IMessageRetryService'
      ]
    },
    MenuAvailabilityService,
    {
      provide: 'IMessageRetryService',
      useClass: MessageRetryService,
    },
    {
      provide: 'IFileStorageService',
      useClass: FileStorageService,
    },
    
    // Repositories - infrastructure first to avoid circular dependencies
    ...infrastructureRepositoryProviders,
    ...domainRepositoryProviders,
    
    // Database connection
    {
      provide: 'DatabaseConnection',
      useFactory: (mongoDBService: MongoDBService) => {
        return mongoDBService.getDb();
      },
      inject: [MongoDBService],
    },
    
    // Event handling
    ...EventHandlers,
    EventPublisher,
  ],
})
export class MenuModule {}