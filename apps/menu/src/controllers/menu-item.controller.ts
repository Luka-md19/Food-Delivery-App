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
  BadRequestException
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MenuItemService } from '../services';
import { ApiController, ApiPaginatedResponse, ApiPaginatioQuery } from '@app/common/swagger';
import { RateLimit } from '@app/common/rate-limiter';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemResponseDto } from '../dto';

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
  @RateLimit('MENU', 'createItem')
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Menu item created', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createItemDto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.menuItemService.create(createItemDto);
  }

  @Put(':id')
  @RateLimit('MENU', 'updateItem')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item updated', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.menuItemService.update(id, updateItemDto);
  }

  @Delete(':id')
  @RateLimit('MENU', 'deleteItem')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Menu item deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid ID format' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.menuItemService.delete(id);
  }

  @Put(':id/availability')
  @RateLimit('MENU', 'updateItemAvailability')
  @ApiOperation({ summary: 'Update menu item availability' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Menu item availability updated', type: MenuItemResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Menu item not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or ID format' })
  async updateAvailability(@Param('id') id: string, @Body() availabilityUpdate: { available: boolean }): Promise<MenuItemResponseDto> {
    if (availabilityUpdate.available === undefined) {
      throw new BadRequestException('Available status is required');
    }
    return this.menuItemService.updateAvailability(id, availabilityUpdate.available);
  }
} 