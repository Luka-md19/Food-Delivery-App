import { Module } from '@nestjs/common';
import { MenuController, CategoryController, MenuItemController } from './controllers';
import { MenuService, CategoryService, MenuItemService } from './services';
import { MongoDBModule } from '@app/common/database/mongodb';
import { ConfigModule, HealthModule } from '@app/common';
import { MenuRepository } from './repositories/menu/menu.repository';
import { CategoryRepository } from './repositories/category/category.repository';
import { CqrsModule } from '@nestjs/cqrs';
import { MenuDomainRepository } from './domain/repositories/menu/menu-domain.repository';
import { MenuItemDomainRepository } from './domain/repositories/menu-item/menu-item-domain.repository';
import { CategoryDomainRepository } from './domain/repositories/category/category-domain.repository';
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
import { FailedMessageRepository } from './repositories/common/failed-message.repository';
import { MessageRetryService, FileStorageService } from './events/services';
import { MenuHealthController } from './health/menu-health.controller';
import { MessagingModule } from '@app/common/messaging';
import { MongoDBService } from '@app/common/database/mongodb/mongodb.service';
import { LoggerModule, LogLevel, LogFormat, LogTransport } from '@app/common/logger';
import { ErrorsModule } from '@app/common/exceptions';
import * as mongoose from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot('menu'),
    LoggerModule.forRoot({
      appName: 'menu-service',
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
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
      { name: MenuItem.name, schema: MenuItemSchema }
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
  controllers: [MenuController, MenuHealthController, CategoryController, MenuItemController],
  providers: [
    // Services
    MenuService,
    CategoryService,
    MenuItemService,
    MenuAvailabilityService,
    MessageRetryService,
    FileStorageService,
    
    // Repositories
    {
      provide: 'IMenuRepository',
      useClass: MenuRepository,
    },
    {
      provide: 'ICategoryRepository',
      useClass: CategoryRepository,
    },
    {
      provide: 'IMenuDomainRepository',
      useClass: MenuDomainRepository,
    },
    {
      provide: 'IMenuItemDomainRepository',
      useClass: MenuItemDomainRepository,
    },
    {
      provide: 'ICategoryDomainRepository',
      useClass: CategoryDomainRepository,
    },
    {
      provide: 'IFailedMessageRepository',
      useClass: FailedMessageRepository,
    },
    
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