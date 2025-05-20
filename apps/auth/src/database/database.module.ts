import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DefaultNamingStrategy, Table } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          synchronize: configService.get<boolean>('DATABASE_SYNC', false),
          dropSchema: configService.get<boolean>('DATABASE_DROP_BEFORE_SYNC', false),
          skipMissingDependenciesCheck: true,
          namingStrategy: new CustomNamingStrategy(),
        };
      },
    }),
  ],
})
export class CustomDatabaseModule {}

class CustomNamingStrategy extends DefaultNamingStrategy {
  indexName(tableOrName: Table | string, columnNames: string[], where?: string): string {
    const randomSuffix = Date.now().toString().slice(-6);
    const standardName = super.indexName(tableOrName, columnNames, where);
    
    if (standardName === 'IDX_4542dd2f38a61354a040ba9fd5') {
      return `${standardName}_${randomSuffix}`;
    }
    
    return standardName;
  }
} 