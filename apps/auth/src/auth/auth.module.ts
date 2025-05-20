import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppConfigService, JwtService as CommonJwtService, LoggerModule } from '@app/common';
import { User } from '../users/entities/user.entity';
import { ResetPasswordToken } from '../reset-password/reset-password-token.entity';
import { AuthService } from './services/auth.service';
import { AuthFacade } from './auth.facade';
import { AuthenticationService } from './services/authentication.service';
import { ServiceAuthService } from './services/service-auth.service';
import { SocialAuthService } from './services/social-auth.service';
import { TokenModule } from '../token/token.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { EmailModule } from '../email/email.module';
import { ResetPasswordModule } from '../reset-password/reset-password.module';
import { EVENT_PUBLISHER } from '@app/common/messaging/publishers';
import { EventPublisher } from '@app/common';
import { TokenBlacklistService } from '@app/common/redis/token-blacklist.service';
import { AuthErrorHandlerService } from '../common/auth-error-handler.service';
import { AuthJwtService } from '../common/auth-jwt.service';
import { EmailQueueService } from '../email/services/email-queue.service';

/**
 * Auth Module
 * 
 * This module organizes all authentication-related services and dependencies.
 * It uses a modular approach with clear separation of concerns.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '15m'),
        },
      }),
    }),
    TypeOrmModule.forFeature([ResetPasswordToken, User]),
    forwardRef(() => require('../users/users.module').UsersModule),
    TokenModule,
    AuditLogModule,
    EmailModule,
    ResetPasswordModule,
    EventEmitterModule.forRoot(),
    LoggerModule,
  ],
  providers: [
    // Authentication services
    AuthService,
    AuthFacade,
    {
      provide: 'AUTH_FACADE',
      useExisting: AuthFacade
    },
    AuthenticationService,
    ServiceAuthService,
    SocialAuthService,
    
    // Enhanced error handler that extends the common library
    {
      provide: 'AuthErrorHandler',
      useClass: AuthErrorHandlerService
    },
    
    // Common JwtService to be injected into our AuthJwtService
    CommonJwtService,
    
    // Enhanced JWT service that leverages the common library
    {
      provide: 'AuthJwtService',
      useClass: AuthJwtService
    },
    
    // Use common library services
    TokenBlacklistService,
    {
      provide: EVENT_PUBLISHER,
      useFactory: (moduleRef: ModuleRef, eventPublisher: EventPublisher) => {
        const logger = new Logger('EventPublisherWithFallback');
        
        return {
          async publish(event: string, data: any): Promise<boolean> {
            try {
              // First try the normal publisher
              await eventPublisher.publish(event, data);
              logger.debug(`Successfully published ${event} event`);
              return true;
            } catch (error) {
              logger.warn(`Failed to publish ${event} event: ${error.message}`);
              
              // If this is an email verification event, try to queue it directly
              if (event === 'email_verification' && data.email && data.token) {
                try {
                  const emailQueueService = moduleRef.get(EmailQueueService, { strict: false });
                  
                  if (emailQueueService) {
                    logger.log(`Fallback: directly queueing email verification for ${data.email}`);
                    await emailQueueService.queueVerificationEmail(
                      data.email, 
                      data.token, 
                      data.priority || 1
                    );
                    return true;
                  }
                } catch (queueError) {
                  logger.error(`Fallback queueing also failed: ${queueError.message}`);
                }
              } 
              
              // For other events or if fallback fails
              logger.error(`Could not process ${event} event, no working fallback available`);
              throw error;
            }
          }
        };
      },
      inject: [ModuleRef, EventPublisher]
    },
  ],
  exports: [
    AuthService,
    AuthFacade,
    'AUTH_FACADE',
    ServiceAuthService,
    SocialAuthService,
    'AuthErrorHandler',
    'AuthJwtService',
  ],
})
export class AuthModule {} 