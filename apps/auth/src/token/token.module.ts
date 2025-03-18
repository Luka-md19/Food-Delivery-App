// apps/auth/src/token/token.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { TokenService } from './token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    DatabaseModule.forFeature([RefreshToken]), 
    AuditLogModule, 
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}