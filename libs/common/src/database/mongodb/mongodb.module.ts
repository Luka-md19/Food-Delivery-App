import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { MongoDBService } from './mongodb.service';

@Module({})
export class MongoDBModule {
  /**
   * Initializes the MongoDB connection.
   * This should only be called once (in your root module).
   * @param service The name of the service (used for loading the correct .env file)
   */
  static forRoot(service: string): DynamicModule {
    return {
      module: MongoDBModule,
      imports: [ConfigModule.forRoot(service)],
      providers: [MongoDBService],
      exports: [MongoDBService],
      global: true,
    };
  }

  /**
   * Use this method in feature modules to inject MongoDB-related providers.
   */
  static forFeature(): DynamicModule {
    return {
      module: MongoDBModule,
      providers: [],
      exports: [],
    };
  }
}