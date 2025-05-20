import { DynamicModule, Module } from '@nestjs/common';
import { ServiceAuthClient } from './service-auth.client';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@app/common/config/config.module';

@Module({})
export class ServiceAuthModule {
  static register(): DynamicModule {
    return {
      module: ServiceAuthModule,
      imports: [
        HttpModule.register({
          timeout: 5000,
          maxRedirects: 5,
        }),
        ConfigModule,
      ],
      providers: [ServiceAuthClient],
      exports: [ServiceAuthClient],
    };
  }
} 