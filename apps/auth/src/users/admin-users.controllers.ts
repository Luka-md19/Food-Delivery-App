import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  NotFoundException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, LoggerFactory } from '@app/common';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  private readonly logger = LoggerFactory.getLogger(AdminUsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // Place the static route first so it doesn't conflict with dynamic routes
  @Get('google-users')
  @ApiOperation({ summary: 'Get all Google registered users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all Google users' })
  async getGoogleUsers() {
    const googleUsers = await this.usersService.findGoogleUsers();
    if (!googleUsers || googleUsers.length === 0) {
      throw new NotFoundException('No Google users found');
    }
    return googleUsers;
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }
  
  @Put(':id/roles')
  @ApiOperation({ summary: 'Update roles for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  async updateUserRoles(
    @Param('id') id: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto,
  ) {
    return await this.usersService.updateUserRoles(id, updateUserRolesDto.roles);
  }
}
