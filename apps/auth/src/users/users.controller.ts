import { 
    Controller, 
    Get, 
    Put, 
    Param, 
    Body, 
    UseGuards, 
    Logger,
    UnauthorizedException
  } from '@nestjs/common';
  import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse 
  } from '@nestjs/swagger';
  
  import { UsersService } from './users.service';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { 
    JwtAuthGuard, 
    CurrentUser, 
    Jwtpayload, 
    ApiAuth 
  } from '@app/common';
  
  @ApiTags('Users')
  @Controller('users')
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Get('profile')
    @ApiAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: Jwtpayload) {
        const logger = new Logger('UsersController');
        
        if (!user) {
            logger.error('No user data available in request');
            throw new UnauthorizedException('User data not found');
        }
    
        if (!user.userId) {
            logger.error('No userId found in user data');
            throw new UnauthorizedException('Invalid user data');
        }
    
        return this.usersService.findById(user.userId);
    }
  
    @Put('profile')
    @ApiAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update user profile' })
    async updateProfile(
      @CurrentUser() user: Jwtpayload, 
      @Body() updateUserDto: UpdateUserDto
    ) {
      return this.usersService.update(user.userId, updateUserDto);
    }
  }