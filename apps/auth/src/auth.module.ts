import { Module } from '@nestjs/common';
import { ConfigModule, DatabaseModule, MessagingModule, RedisModule, HealthModule, LoggerModule, LogLevel, LogFormat, LogTransport } from '@app/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@app/common/Jwt';
import { ThrottlerModule, ThrottlerStorageType } from '@app/common/rate-limiter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from './users/users.module';
import { TokenModule } from './token/token.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ResetPasswordService } from './Reset-Password/reset-password.service';
import { ResetPasswordToken } from './Reset-Password/reset-password-token.entity';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './token/entities/refresh-token.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { EmailModule } from './email/email.module';
import { EmailService } from './email/email.service';
import { EmailConsumerController } from './email/email.consumer.controller';
import { AuthHealthController } from './health/auth-health.controller';
import { AppConfigService } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot('auth'),
    LoggerModule.forRoot({
      appName: 'auth-service',
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      format: process.env.NODE_ENV === 'production' ? LogFormat.JSON : LogFormat.TEXT,
      transports: process.env.NODE_ENV === 'production' 
        ? [LogTransport.CONSOLE, LogTransport.DAILY_ROTATE_FILE] 
        : [LogTransport.CONSOLE],
      logDir: 'logs/auth',
    }),
    DatabaseModule.forRoot('AUTH', [User, RefreshToken, ResetPasswordToken, AuditLog]),
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    TokenModule,
    AuditLogModule,
    TypeOrmModule.forFeature([ResetPasswordToken]),
    MessagingModule,
    EmailModule,
    RedisModule,
    HealthModule.register({ serviceName: 'auth-service' }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
      storageType: ThrottlerStorageType.REDIS,
      errorMessage: 'Too many requests from this IP, please try again later',
      excludePaths: ['/api/health'],
      useGlobalGuard: true,
      useGlobalFilter: true,
      useGlobalInterceptor: true,
    }),
  ],
  controllers: [AuthController, EmailConsumerController, AuthHealthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    ResetPasswordService,
    GoogleStrategy,
    EmailService,
    {
      provide: 'EMAIL_SERVICE',
      useExisting: 'RABBITMQ_CLIENT',
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}