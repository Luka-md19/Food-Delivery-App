import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  Logger, 
  forwardRef,
  Inject
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@app/common';
import { AuthService } from '../auth.service';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}
  private readonly MAX_FAILED_ATTEMPTS = 8;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; 

  async create(createUserDto: Partial<CreateUserDto>): Promise<User> {
    try {
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }
      
      let hashedPassword = null;
      if (createUserDto.password) {
        hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      }
      
      const userData = {
        ...createUserDto,
        password: hashedPassword, // remains null if no password is provided (Google users)
        roles: createUserDto.roles || [UserRole.CUSTOMER],
        isActive: true,
      };
      
      return await this.userRepository.save(this.userRepository.create(userData));
    } catch (error) {
      this.logger.error(`User creation error: ${error.message}`);
      throw error;
    }
  }
  
  // Get user entity for internal use
  public async getUserEntity(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'roles', 'isActive', 'password', 'googleId', 'isEmailVerified', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  // Get user DTO for API responses
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.getUserEntity(id);
    return plainToInstance(UserResponseDto, user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: [] // Add relations if needed
    });
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error) {
      this.logger.error(`Error fetching all users: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findById(id);
      Object.assign(user, updateUserDto);
      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(`User update error: ${error.message}`);
      throw error;
    }
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    try {
      const user = await this.getUserEntity(id);
      user.password = hashedPassword;
      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(`Password update error: ${error.message}`);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.getUserEntity(id);
      await this.userRepository.remove(user);
    } catch (error) {
      this.logger.error(`User deletion error: ${error.message}`);
      throw error;
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
