import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { DatabaseConfig } from '../config/interfaces/database.interface';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  getDataSource(): DataSource {
    if (!this.dataSource.isInitialized) {
      this.logger.error('DataSource is not initialized');
      throw new Error('DataSource is not initialized');
    }
    return this.dataSource;
  }

  async transaction<T>(
    runInTransaction: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await runInTransaction(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Transaction failed: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
