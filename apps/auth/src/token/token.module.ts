// apps/auth/src/token/token.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule, LoggerFactory } from '@app/common';
import { TokenService } from './token.service';
import { TokenManagerService } from './services/token-manager.service';
import { SessionService } from './services/session.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { TokenConsumerService } from './services/token-consumer.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminTokenController } from './controllers/admin-token.controller';
import { AuthErrorHandlerService } from '../common/auth-error-handler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { TOKEN_CONSUMER_SERVICE } from './token.constants';

const logger = LoggerFactory.getLogger('TokenModule');

/**
 * TokenModule provides services for token management, session handling, and token cleanup.
 * 
 * This module includes:
 * - TokenService: The main facade for token operations
 * - TokenManagerService: Handles core token operations
 * - SessionService: Manages user sessions
 * - TokenCleanupService: Handles token expiration and cleanup
 * - TokenConsumerService: Manages token-related queue processing
 */
@Module({
  imports: [
    // Database and ORM
    DatabaseModule.forFeature([RefreshToken]), 
    TypeOrmModule.forFeature([RefreshToken]),
    
    // Configuration
    ConfigModule,
    
    // Required modules
    AuditLogModule,
    forwardRef(() => UsersModule),
    ScheduleModule.forRoot(),
  ],
  controllers: [AdminTokenController],
  providers: [
    // Core service classes
    TokenService,
    TokenManagerService,
    {
      provide: 'TOKEN_MANAGER_SERVICE',
      useExisting: TokenManagerService
    },
    SessionService,
    TokenCleanupService,
    {
      provide: TOKEN_CONSUMER_SERVICE,
      useClass: TokenConsumerService,
    },
    // Support services
    {
      provide: 'AuthErrorHandler',
      useClass: AuthErrorHandlerService
    },
    TokenConsumerService, // Keep concrete implementation available for direct injection
  ],
  exports: [
    TokenService, 
    TokenManagerService,
    'TOKEN_MANAGER_SERVICE',
    TokenCleanupService, 
    TOKEN_CONSUMER_SERVICE, 
    TokenConsumerService
  ],
})
export class TokenModule {}