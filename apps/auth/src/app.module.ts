import { Module, ValidationPipe } from '@nestjs/common';
import { 
  ConfigModule, 
  DatabaseModule,
  MessagingModule, 
  RedisModule, 
  HealthModule, 
  LoggerModule, 
  LogLevel, 
  LogFormat, 
  LogTransport,
  ErrorsModule,
  LoggingInterceptor,
  AppConfigService,
  HealthController,
  JwtModule,
  WorkerThreadsModule,
} from '@app/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, DisabledThrottlerStorage } from '@app/common/rate-limiter';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthExceptionsFilter } from '@app/common/exceptions/auth-exceptions.filter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerFactory } from '@app/common/logger/logger.factory';
import { Injectable, ExecutionContext } from '@nestjs/common';


// Controllers
import { 
  AuthController,
  ProfileController,
  SessionsController,
  SocialAuthController,
  ServiceAuthController,
  LoadTestController
} from './controllers';
import { AuthHealthController } from './controllers/auth-health.controller';
import { EmailConsumerController } from './email/controllers/email.consumer.controller';

// Entities
import { User } from './users/entities/user.entity';
import { RefreshToken } from './token/entities/refresh-token.entity';
import { ResetPasswordToken } from './reset-password/reset-password-token.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { EmailVerificationJob } from './email/entities/email-verification-job.entity';

// Modules
import { UsersModule } from './users/users.module';
import { TokenModule } from './token/token.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { EmailModule } from './email/email.module';
import { CacheModule } from '@app/common/redis/cache.module';
import { AuthModule } from './auth/auth.module';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ServiceJwtStrategy } from './strategies/service-jwt.strategy';

// Services
import { CachedAuthService } from './auth/services/cached-auth.service';
import { CacheService } from '@app/common/redis/cache.service';
import { TokenCleanupService } from './token/services/token-cleanup.service';
import { AuthFacade } from './auth/auth.facade';
import { AuthService } from './auth/services/auth.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot('auth'),
    
    // Scheduling for cleanup tasks
    ScheduleModule.forRoot(),
    
    // Event emitter for pub/sub events
    EventEmitterModule.forRoot(),
    
    // Logging
    LoggerModule.forRoot({
      appName: 'auth-service',
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      format: process.env.NODE_ENV === 'production' ? LogFormat.JSON : LogFormat.TEXT,
      transports: process.env.NODE_ENV === 'production' 
        ? [LogTransport.CONSOLE, LogTransport.DAILY_ROTATE_FILE] 
        : [LogTransport.CONSOLE],
      logDir: 'logs/auth',
    }),
    
    // Worker Threads for CPU-intensive operations
    WorkerThreadsModule.register(),
    
    // Database - initialize with entities
    DatabaseModule.forRoot('AUTH', [
      User, 
      RefreshToken, 
      ResetPasswordToken, 
      AuditLog,
      EmailVerificationJob
    ]),
    
    // RabbitMQ Client
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: AppConfigService) => {
          const logger = LoggerFactory.getLogger('RabbitMQ');
          
          return {
            transport: Transport.RMQ,
            options: {
              urls: [configService.get('RABBITMQ_URL', 'amqp://localhost:5672')],
              queue: configService.get('RABBITMQ_QUEUE', 'auth_queue'),
              queueOptions: {
                durable: true
              },
              // Add retry options and timeouts
              noAck: false,
              prefetchCount: 10,
              isGlobalPrefetchCount: false,
              // Reduce retry attempts to fail faster in development
              maxConnectionAttempts: 2,
              // Use onError callback to handle connection errors gracefully
              // This prevents the app from crashing
              retryAttempts: 2,
              retryDelay: 3000,
            },
          };
        },
        inject: [AppConfigService],
      },
    ]),
    
    
    // Authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Feature modules
    AuthModule,
    UsersModule,
    TokenModule,
    AuditLogModule,
    EmailModule,
    
    // Messaging
    MessagingModule.forRoot({
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
      successThreshold: 5
    }),
    
    // Redis, caching and health
    RedisModule,
    CacheModule.register(),
    HealthModule.register({ 
      serviceName: 'auth-service',
      registerController: false 
    }),
    
    // Error handling
    ErrorsModule,
    
    // Rate limiting - Using environment variable to toggle
    ...(process.env.ENABLE_RATE_LIMITING !== 'false' ? [
      // Standard rate limiting configuration when enabled (the default)
      ThrottlerModule.registerAsync({
        imports: [ConfigModule],
        useFactory: (configService: AppConfigService) => ({
          ttl: configService.get('THROTTLE_TTL', 60),
          limit: configService.get('THROTTLE_LIMIT', 3),
          storage: 'redis',
          microserviceName: 'auth-service',
          errorMessage: 'Too many requests from this IP, please try again later',
          excludeRoutes: ['/api/health/*path'],
          keyPrefix: 'auth-throttler:',
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
        microserviceName: 'auth-service', 
        errorMessage: 'Rate limiting disabled for testing',
        excludeRoutes: ['/api/health/*path', '/api/load-test/*'],
        keyPrefix: 'auth-throttler:',
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
    
    JwtModule,
  ],
  controllers: [
    AuthHealthController,
    AuthController, 
    ProfileController, 
    SessionsController, 
    SocialAuthController, 
    ServiceAuthController,
    LoadTestController
  ],
  providers: [
    // Services
    {
      provide: CachedAuthService,
      useFactory: (authFacade, cacheService, authService) => {
        return new CachedAuthService(authFacade, cacheService, authService);
      },
      inject: [AuthFacade, CacheService, AuthService]
    },
    
    // Authentication strategies
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    ServiceJwtStrategy,
    
    // Health Check Providers
    {
      provide: 'SERVICE_NAME',
      useValue: 'auth-service'
    },
    {
      provide: 'INSTANCE_ID',
      useValue: `auth-${process.env.POD_NAME || process.env.HOSTNAME || `${Date.now()}`}`
    },
    {
      provide: 'HOSTNAME',
      useValue: process.env.HOSTNAME || 'localhost'
    },
    {
      provide: 'HEALTH_PATH',
      useValue: 'health'
    },
    
    // Global providers
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AuthExceptionsFilter,
    },
  ],
})
export class AppModule {

} 