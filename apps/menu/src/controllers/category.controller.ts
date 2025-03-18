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
  DefaultValuePipe
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CategoryService } from '../services';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from '../dto';
import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery } from '@app/common/swagger';
import { RateLimit } from '@app/common/rate-limiter';

@Controller('categories')
@ApiController('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RateLimit('MENU', 'findAllCategories')
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiPaginatioQuery()
  @ApiPaginatedResponse(CategoryResponseDto, 'Successfully retrieved paginated categories')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('menuId') menuId?: string,
    @Query('activeOnly', new DefaultValuePipe(false)) activeOnly?: boolean
  ): Promise<{
    items: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If menuId is provided, get categories for that menu
    if (menuId) {
      const categories = await this.categoryService.findByMenuId(menuId, activeOnly);
      return {
        items: categories,
        total: categories.length,
        page: 1,
        limit: categories.length,
        pages: 1
      };
    }
    
    // Otherwise, get all categories with pagination
    return this.categoryService.findAll(page, limit, { active: activeOnly || undefined });
  }

  @Get(':id')
  @RateLimit('MENU', 'findCategoryById')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category found', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async findById(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findById(id);
  }

  @Post()
  @RateLimit('MENU', 'createCategory')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @RateLimit('MENU', 'updateCategory')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category updated', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @RateLimit('MENU', 'deleteCategory')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Category deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoryService.delete(id);
  }

  @Post(':categoryId/items/:itemId')
  @RateLimit('MENU', 'addItemToCategory')
  @ApiOperation({ summary: 'Add an item to a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Item added to category', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async addItem(
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.addItem(categoryId, itemId);
  }

  @Delete(':categoryId/items/:itemId')
  @RateLimit('MENU', 'removeItemFromCategory')
  @ApiOperation({ summary: 'Remove an item from a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Item removed from category', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async removeItem(
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.removeItem(categoryId, itemId);
  }
} 