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
  import { MenuService } from '../services';
  import { CreateMenuDto, UpdateMenuDto, MenuResponseDto } from '../dto';
  import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery } from '@app/common/swagger';
  import { RateLimit } from '@app/common/rate-limiter';
  
  @Controller('menus')
  @ApiController('menus')
  export class MenuController {
    constructor(private readonly menuService: MenuService) {}
  
    @Get()
    @RateLimit('MENU', 'findAll')
    @ApiOperation({ summary: 'Get all menus with pagination' })
    @ApiPaginatioQuery()
    @ApiQuery({ name: 'restaurantId', required: false, type: String, description: 'Filter menus by restaurant ID' })
    @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter to active menus only' })
    @ApiPaginatedResponse(MenuResponseDto, 'Successfully retrieved paginated menus')
    async findAll(
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
      @Query('restaurantId') restaurantId?: string,
      @Query('activeOnly', new DefaultValuePipe(false)) activeOnly?: boolean
    ): Promise<{
      items: MenuResponseDto[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }> {
      // If restaurantId is provided, get menus for that restaurant
      if (restaurantId) {
        const menus = await this.menuService.findByRestaurantId(restaurantId, activeOnly);
        return {
          items: menus,
          total: menus.length,
          page: 1,
          limit: menus.length,
          pages: 1
        };
      }
      
      // Otherwise, get all menus with pagination
      return this.menuService.findAll(page, limit, { active: activeOnly || undefined });
    }
  
    @Get(':id')
    @RateLimit('MENU', 'findById')
    @ApiOperation({ summary: 'Get a menu by ID' })
    @ApiParam({ name: 'id', description: 'Menu ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Menu found', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    async findById(@Param('id') id: string): Promise<MenuResponseDto> {
      return this.menuService.findById(id);
    }
  
    @Post()
    @RateLimit('MENU', 'create')
    @ApiOperation({ summary: 'Create a new menu' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Menu created', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
      return this.menuService.create(createMenuDto);
    }
  
    @Put(':id')
    @RateLimit('MENU', 'update')
    @ApiOperation({ summary: 'Update a menu' })
    @ApiParam({ name: 'id', description: 'Menu ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Menu updated', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto): Promise<MenuResponseDto> {
      return this.menuService.update(id, updateMenuDto);
    }
  
    @Delete(':id')
    @RateLimit('MENU', 'delete')
    @ApiOperation({ summary: 'Delete a menu' })
    @ApiParam({ name: 'id', description: 'Menu ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Menu deleted' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string): Promise<void> {
      await this.menuService.delete(id);
    }
  
    @Post(':menuId/categories/:categoryId')
    @RateLimit('MENU', 'addCategory')
    @ApiOperation({ summary: 'Add a category to a menu' })
    @ApiParam({ name: 'menuId', description: 'Menu ID' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Category added to menu', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu or category not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    async addCategory(
      @Param('menuId') menuId: string,
      @Param('categoryId') categoryId: string,
    ): Promise<MenuResponseDto> {
      return this.menuService.addCategory(menuId, categoryId);
    }
  
    @Delete(':menuId/categories/:categoryId')
    @RateLimit('MENU', 'removeCategory')
    @ApiOperation({ summary: 'Remove a category from a menu' })
    @ApiParam({ name: 'menuId', description: 'Menu ID' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Category removed from menu', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    async removeCategory(
      @Param('menuId') menuId: string,
      @Param('categoryId') categoryId: string,
    ): Promise<MenuResponseDto> {
      return this.menuService.removeCategory(menuId, categoryId);
    }
  }