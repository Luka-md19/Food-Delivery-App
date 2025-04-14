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
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MenuItemService } from '../services';
import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery, ApiAuth } from '@app/common/swagger';
import { RateLimit } from '@app/common/rate-limiter';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/common';
import { 
  CreateMenuItemDto, 
  UpdateMenuItemDto, 
  MenuItemResponseDto, 
  CreateOptionTypeDto, 
  UpdateOptionTypeDto,
  OptionTypeDto,
  SearchMenuItemDto,
  PriceRangeDto,
  SortField,
  SortOrder
} from '../dto';

@Controller('menu-items')
@ApiController('menu-items')
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Get()
  @RateLimit('MENU', 'findAllItems')
  @ApiOperation({ summary: 'Get all menu items with pagination' })
  @ApiPaginatioQuery()
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter items by category ID' })
  @ApiQuery({ name: 'available', required: false, type: Boolean, description: 'Filter by availability' })
  @ApiPaginatedResponse(MenuItemResponseDto, 'Successfully retrieved paginated menu items')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
    @Query('available', new DefaultValuePipe(undefined)) available?: boolean
  ): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // If categoryId is provided, get items for that category
    if (categoryId) {
      return this.menuItemService.findByCategoryId(categoryId, page, limit, { available });
    }
    
    // Otherwise, get all items with pagination
    return this.menuItemService.findAll(page, limit, { available });
  }

  @Get('search')
  @RateLimit('MENU', 'searchItems')
  @ApiOperation({ summary: 'Search menu items with advanced filtering' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Text search query' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'tags', required: false, type: [String], isArray: true, description: 'Filter by tags' })
  @ApiQuery({ name: 'dietary', required: false, type: [String], isArray: true, description: 'Filter by dietary restrictions' })
  @ApiQuery({ name: 'available', required: false, type: Boolean, description: 'Filter by availability' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Filter by featured status' })
  @ApiQuery({ name: 'min_price', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'max_price', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortField, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder, description: 'Sort order (asc or desc)' })
  @ApiPaginatioQuery()
  @ApiPaginatedResponse(MenuItemResponseDto, 'Successfully retrieved search results')
  async search(
    @Query() searchParams: SearchMenuItemDto,
    @Query('min_price', new DefaultValuePipe(undefined), new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('max_price', new DefaultValuePipe(undefined), new ParseIntPipe({ optional: true })) maxPrice?: number,
  ): Promise<{
    items: MenuItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // Add price range if min or max price is provided
    if (minPrice !== undefined || maxPrice !== undefined) {
      searchParams.priceRange = searchParams.priceRange || { };
      if (minPrice !== undefined) searchParams.priceRange.min = minPrice;
      if (maxPrice !== undefined) searchParams.priceRange.max = maxPrice;
    }
    
    return this.menuItemService.search(searchParams);
  }

  @Get(':id')
  @RateLimit('MENU', 'findItemById')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item found', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async findById(@Param('id') id: string): Promise<MenuItemResponseDto> {
    return this.menuItemService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'createItem')
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Menu item created', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.menuItemService.create(createItemDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'updateItem')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item updated', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.menuItemService.update(id, updateItemDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'deleteItem')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Menu item deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.menuItemService.delete(id);
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'updateItemAvailability')
  @ApiOperation({ summary: 'Update menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item availability updated', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  async updateAvailability(@Param('id') id: string, @Body() availabilityUpdate: { available: boolean }): Promise<MenuItemResponseDto> {
    if (availabilityUpdate.available === undefined) {
      throw new BadRequestException('Available status is required');
    }
    return this.menuItemService.updateAvailability(id, availabilityUpdate.available);
  }

  @Get(':id/options')
  @RateLimit('MENU', 'getItemOptions')
  @ApiOperation({ summary: 'Get all options for a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item options retrieved', type: [OptionTypeDto] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  async getOptions(@Param('id') id: string): Promise<OptionTypeDto[]> {
    return this.menuItemService.getOptions(id);
  }

  @Post(':id/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'addItemOption')
  @ApiOperation({ summary: 'Add a new option to a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiBody({ type: CreateOptionTypeDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Option added to menu item', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async addOption(
    @Param('id') id: string,
    @Body() createOptionDto: CreateOptionTypeDto
  ): Promise<MenuItemResponseDto> {
    return this.menuItemService.addOption(id, createOptionDto);
  }

  @Put(':id/options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'updateItemOption')
  @ApiOperation({ summary: 'Update an option of a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiParam({ name: 'optionId', description: 'Option unique identifier' })
  @ApiBody({ type: UpdateOptionTypeDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Option updated', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item or option not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() updateOptionDto: UpdateOptionTypeDto
  ): Promise<MenuItemResponseDto> {
    return this.menuItemService.updateOptionById(id, optionId, updateOptionDto);
  }

  @Delete(':id/options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiAuth()
  @RateLimit('MENU', 'removeItemOption')
  @ApiOperation({ summary: 'Remove an option from a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiParam({ name: 'optionId', description: 'Option unique identifier' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Option removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item or option not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string
  ): Promise<void> {
    await this.menuItemService.removeOptionById(id, optionId);
  }
} 