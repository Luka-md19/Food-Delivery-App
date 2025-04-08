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
import { CategoryService } from '../services';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from '../dto';
import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery, ApiAuth } from '@app/common/swagger';
import { RateLimit } from '@app/common/rate-limiter';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/common';

@Controller('categories')
@ApiController('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RateLimit('MENU', 'findAll')
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiPaginatioQuery()
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter to active categories only' })
  @ApiPaginatedResponse(CategoryResponseDto, 'Successfully retrieved paginated categories')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('active', new DefaultValuePipe(false)) active?: boolean
  ): Promise<{
    items: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    return this.categoryService.findAll(page, limit, { active: active || undefined });
  }

  @Get(':id')
  @RateLimit('MENU', 'findById')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category found', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async findById(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'create')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'update')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category updated', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'delete')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Category deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoryService.delete(id);
  }

  @Post(':categoryId/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'addItemToCategory')
  @ApiOperation({ summary: 'Add an item to a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Item added to category', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  async addItem(
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.addItem(categoryId, itemId);
  }

  @Delete(':categoryId/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'removeItemFromCategory')
  @ApiOperation({ summary: 'Remove an item from a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Item removed from category', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Item successfully removed from category' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.categoryService.removeItem(categoryId, itemId);
  }
} 
