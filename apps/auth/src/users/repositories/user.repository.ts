import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '@app/common';

@Injectable()
export class UserRepository extends Repository<User> {
  private readonly logger = new Logger(UserRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.findOne({ 
        where: { email },
        relations: ['refreshTokens']
      });
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const user = this.create(userData);
      return this.save(user);
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  async findByRoles(roles: UserRole[]): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.roles && ARRAY[:...roles]', { roles })
      .getMany();
  }
}
