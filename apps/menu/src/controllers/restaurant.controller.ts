import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpStatus, 
  HttpCode,
  ValidationPipe,
  UsePipes,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RestaurantService } from '../services';
import { CreateRestaurantDto, UpdateRestaurantDto, RestaurantResponseDto } from '../dto';
import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery, ApiAuth } from '@app/common/swagger';
import { DynamicRateLimit } from '@app/common/rate-limiter';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/common';

@Controller('restaurants')
@ApiController('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  @DynamicRateLimit('RESTAURANT', 'findAll')
  @ApiOperation({ summary: 'Get all restaurants with pagination' })
  @ApiPaginatioQuery()
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter to active restaurants only' })
  @ApiPaginatedResponse(RestaurantResponseDto, 'Successfully retrieved paginated restaurants')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('active', new DefaultValuePipe(false)) active?: boolean
  ): Promise<{
    items: RestaurantResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    return this.restaurantService.findAll(page, limit, { active: active || undefined });
  }

  @Get(':id')
  @DynamicRateLimit('RESTAURANT', 'findById')
  @ApiOperation({ summary: 'Get a restaurant by ID' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Restaurant found', type: RestaurantResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Restaurant not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async findById(@Param('id') id: string): Promise<RestaurantResponseDto> {
    return this.restaurantService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiAuth()
  @DynamicRateLimit('RESTAURANT', 'create')
  @ApiOperation({ summary: 'Create a new restaurant' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Restaurant created', type: RestaurantResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createRestaurantDto: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    return this.restaurantService.create(createRestaurantDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiAuth()
  @DynamicRateLimit('RESTAURANT', 'update')
  @ApiOperation({ summary: 'Update a restaurant' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Restaurant updated', type: RestaurantResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Restaurant not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() updateRestaurantDto: UpdateRestaurantDto): Promise<RestaurantResponseDto> {
    return this.restaurantService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiAuth()
  @DynamicRateLimit('RESTAURANT', 'delete')
  @ApiOperation({ summary: 'Delete a restaurant' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Restaurant deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Restaurant not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.restaurantService.delete(id);
  }
} 