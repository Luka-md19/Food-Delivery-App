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
  import { MenuService } from '../services';
  import { CreateMenuDto, UpdateMenuDto, MenuResponseDto } from '../dto';
  import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery, ApiAuth } from '@app/common/swagger';
  import { RateLimit } from '@app/common/rate-limiter';
  import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/common';
  
  @Controller('menus')
  @ApiController('menus')
  export class MenuController {
    constructor(private readonly menuService: MenuService) {}
  
    @Get()
    @RateLimit('MENU', 'findAll')
    @ApiOperation({ summary: 'Get all menus with pagination' })
    @ApiPaginatioQuery()
    @ApiQuery({ name: 'restaurantId', required: false, description: 'Restaurant ID to filter by' })
    @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter to active menus only' })
    @ApiPaginatedResponse(MenuResponseDto, 'Successfully retrieved paginated menus')
    async findAll(
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
      @Query('restaurantId') restaurantId?: string,
      @Query('active', new DefaultValuePipe(false)) active?: boolean
    ): Promise<{
      items: MenuResponseDto[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }> {
      return this.menuService.findAll(page, limit, {
        restaurantId: restaurantId || undefined,
        active: active || undefined
      });
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
    @ApiAuth()
    @RateLimit('MENU', 'create')
    @ApiOperation({ summary: 'Create a new menu' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Menu created', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
      return this.menuService.create(createMenuDto);
    }
  
    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
    @ApiAuth()
    @RateLimit('MENU', 'update')
    @ApiOperation({ summary: 'Update a menu' })
    @ApiParam({ name: 'id', description: 'Menu ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Menu updated', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto): Promise<MenuResponseDto> {
      return this.menuService.update(id, updateMenuDto);
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
    @ApiAuth()
    @RateLimit('MENU', 'delete')
    @ApiOperation({ summary: 'Delete a menu' })
    @ApiParam({ name: 'id', description: 'Menu ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Menu deleted' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string): Promise<void> {
      await this.menuService.delete(id);
    }
  
    @Post(':menuId/categories/:categoryId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
    @ApiAuth()
    @RateLimit('MENU', 'addCategory')
    @ApiOperation({ summary: 'Add a category to a menu' })
    @ApiParam({ name: 'menuId', description: 'Menu ID' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Category added to menu', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu or category not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    async addCategory(
      @Param('menuId') menuId: string,
      @Param('categoryId') categoryId: string,
    ): Promise<MenuResponseDto> {
      return this.menuService.addCategory(menuId, categoryId);
    }
  
    @Delete(':menuId/categories/:categoryId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
    @ApiAuth()
    @RateLimit('MENU', 'removeCategory')
    @ApiOperation({ summary: 'Remove a category from a menu' })
    @ApiParam({ name: 'menuId', description: 'Menu ID' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Category removed from menu', type: MenuResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    async removeCategory(
      @Param('menuId') menuId: string,
      @Param('categoryId') categoryId: string,
    ): Promise<MenuResponseDto> {
      return this.menuService.removeCategory(menuId, categoryId);
    }
  }