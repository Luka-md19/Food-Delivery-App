// libs/common/src/jwt/jwt.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule } from '../config/config.module';
import { jwtConfig } from './jwt.config';

@Global()
@Module({
  imports: [
    NestJwtModule.registerAsync(jwtConfig),
  ],
  exports: [NestJwtModule],
})
export class JwtModule {}