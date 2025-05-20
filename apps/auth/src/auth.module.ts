import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, MessagingModule } from '@app/common';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from './users/users.module';
import { TokenModule } from './token/token.module';
import { ResetPasswordModule } from './reset-password/reset-password.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './token/entities/refresh-token.entity';
import { ResetPasswordToken } from './reset-password/reset-password-token.entity';
import { DatabaseModule } from '@app/common';
import { EmailConsumerController } from './email/email.consumer.controller';
import { AuditLog } from './audit-log/audit-log.entity';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RedisModule } from '@app/common/redis/redis.module';
import { AuthController } from './controllers';
import { AuthService } from './auth/services/auth.service';
import { EmailService } from './email/services/email.service';


@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    TokenModule,
    AuditLogModule,
    ResetPasswordModule,
    MessagingModule,
    RedisModule,
  ],
  controllers: [AuthController, EmailConsumerController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
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
