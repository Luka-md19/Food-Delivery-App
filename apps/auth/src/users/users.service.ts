import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  Inject
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, LoggerFactory } from '@app/common';
import { AuthFacade } from '../auth/auth.facade';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { AuthErrorHandlerService } from '../common/auth-error-handler.service';
import { hash } from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = LoggerFactory.getLogger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('AUTH_FACADE')
    private readonly authFacade: AuthFacade,
    @Inject('AuthErrorHandler')
    private readonly errorHandler: AuthErrorHandlerService
  ) {}
  private readonly MAX_FAILED_ATTEMPTS = 8;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; 

  /**
   * Create a new user
   */
  async create(createUserDto: { 
    email: string; 
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    const hashedPassword = await hash(createUserDto.password, 10);
    
    const user = this.userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
    });

    return this.userRepository.save(user);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    this.logger.debug(`Finding user by ID: ${id}`);
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      return null;
    }
    
    // Return a simplified user object without sensitive data
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Find a user by ID with password included
   * This method should only be used for authentication purposes
   */
  async findByIdWithPassword(id: string): Promise<User | null> {
    this.logger.debug(`Finding user by ID with password: ${id}`);
    return this.userRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'roles', 'isActive', 'password', 'isEmailVerified', 'createdAt', 'updatedAt']
    });
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: Partial<User>): Promise<User> {
    this.logger.log(`Updating user with ID: ${id}`);
    await this.userRepository.update(id, updateUserDto);
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Delete a user
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing user with ID: ${id}`);
    await this.userRepository.delete(id);
  }

  // Get user entity for internal use
  public async getUserEntity(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id },
        select: ['id', 'email', 'firstName', 'lastName', 'roles', 'isActive', 'password', 'googleId', 'isEmailVerified', 'createdAt', 'updatedAt']
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      return user;
    } catch (error) {
      return this.errorHandler.handleUserError(error);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error) {
      return this.errorHandler.handleUserError(error);
    }
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    try {
      const user = await this.getUserEntity(id);
      user.password = hashedPassword;
      return await this.userRepository.save(user);
    } catch (error) {
      return this.errorHandler.handleUserError(error);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.getUserEntity(id);
      await this.userRepository.remove(user);
    } catch (error) {
      return this.errorHandler.handleUserError(error);
    }
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.getUserEntity(id);
    user.isActive = false;
    return await this.userRepository.save(user);
  }

  async updateUserRoles(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.getUserEntity(id);
    user.roles = roles;
    return await this.userRepository.save(user);
  }

  // Updates the googleId for an existing user
  async updateGoogleId(userId: string, googleId: string): Promise<User> {
    const user = await this.getUserEntity(userId);
    user.googleId = googleId;
    return await this.userRepository.save(user);
  }

  // Fetches all users that have a non-null googleId
  async findGoogleUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: {
        googleId: Not(IsNull()),
      },
      select: ['id', 'email', 'firstName', 'lastName', 'roles', 'isActive', 'googleId'],
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });
    if (user && user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return null;
    }
    return user;
  }

  async recordFailedLoginAttempt(user: User): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + this.LOCK_DURATION_MS);
      this.logger.warn(`User ${user.email} has been locked out until ${user.lockUntil}`);
    }
    await this.userRepository.save(user);
  }

  async resetFailedLoginAttempts(user: User): Promise<void> {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await this.userRepository.save(user);
  }
}
