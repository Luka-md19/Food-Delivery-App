// libs/common/src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './redis.constants';
import { TokenBlacklistService } from './token-blacklist.service';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD', '');
        return new Redis({
          host,
          port,
          password: password || undefined,
        });
      },
      inject: [ConfigService],
    },
    TokenBlacklistService,
  ],
  exports: [REDIS_CLIENT, TokenBlacklistService],
})
export class RedisModule {}
