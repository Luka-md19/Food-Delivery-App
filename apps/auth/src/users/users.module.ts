// apps/auth/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/common/database';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controllers';
import { AuthErrorHandlerService } from '../common/auth-error-handler.service';


@Module({
  imports: [
    // This provides the User repository without reinitializing TypeORM.
    // DatabaseModule.forFeature([User]),
    DatabaseModule.forFeature([User]),
    // Re-add the AuthModule to access the AuthFacade
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [
    UsersService,
    {
      provide: 'AuthErrorHandler',
      useClass: AuthErrorHandlerService
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
