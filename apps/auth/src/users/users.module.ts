// apps/auth/src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controllers';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth.module';

@Module({
  imports: [
    // This provides the User repository without reinitializing TypeORM.
    DatabaseModule.forFeature([User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
