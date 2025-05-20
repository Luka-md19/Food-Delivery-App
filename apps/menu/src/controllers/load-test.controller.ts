import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SkipRateLimit } from '@app/common/rate-limiter';
import { v4 as uuidv4 } from 'uuid';
import { CreateMenuDto } from '../dto/menu/create-menu.dto';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { CreateMenuItemDto } from '../dto/menu-item/create-menu-item.dto';
import { UpdateMenuDto } from '../dto/menu/update-menu.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { UpdateMenuItemDto } from '../dto/menu-item/update-menu-item.dto';

/**
 * Controller dedicated to load testing
 * Provides simplified endpoints that bypass normal flows
 * for high throughput load testing
 */
@ApiTags('Load Testing')
@Controller('load-test/menu')
export class LoadTestController {

  /**
   * Simplified menu creation endpoint for load testing
   */
  @Post('menus')
  @SkipRateLimit()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Simplified menu creation endpoint for load testing' })
  @ApiBody({ type: CreateMenuDto })
  @ApiResponse({
    status: 201,
    description: 'Returns mock menu data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        restaurantId: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async createMenu(@Body() createMenuDto: CreateMenuDto) {
    const mockMenu = {
      id: uuidv4(),
      name: createMenuDto.name || 'Test Menu',
      description: createMenuDto.description || 'Test Menu Description',
      restaurantId: createMenuDto.restaurantId || uuidv4(),
      active: createMenuDto.active !== undefined ? createMenuDto.active : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return mockMenu;
  }

  /**
   * Simplified category creation endpoint for load testing
   */
  @Post('categories')
  @SkipRateLimit()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Simplified category creation endpoint for load testing' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Returns mock category data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        active: { type: 'boolean' },
        menuId: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const mockCategory = {
      id: uuidv4(),
      name: createCategoryDto.name || 'Test Category',
      description: createCategoryDto.description || 'Test Category Description',
      menuId: createCategoryDto.menuId || uuidv4(),
      active: createCategoryDto.active !== undefined ? createCategoryDto.active : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return mockCategory;
  }

  /**
   * Simplified menu item creation endpoint for load testing
   */
  @Post('menu-items')
  @SkipRateLimit()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Simplified menu item creation endpoint for load testing' })
  @ApiBody({ type: CreateMenuItemDto })
  @ApiResponse({
    status: 201,
    description: 'Returns mock menu item data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        categoryId: { type: 'string' },
        available: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    const mockMenuItem = {
      id: uuidv4(),
      name: createMenuItemDto.name || 'Test Menu Item',
      description: createMenuItemDto.description || 'Test Menu Item Description',
      price: createMenuItemDto.price || 9.99,
      categoryId: createMenuItemDto.categoryId || uuidv4(),
      available: createMenuItemDto.available !== undefined ? createMenuItemDto.available : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return mockMenuItem;
  }

  /**
   * Simplified endpoint to get all menus for load testing
   */
  @Get('menus')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Simplified endpoint to get all menus for load testing' })
  @ApiResponse({
    status: 200,
    description: 'Returns mock menu list',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              restaurantId: { type: 'string' },
              active: { type: 'boolean' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        pages: { type: 'number' }
      }
    }
  })
  async getMenus() {
    // Generate 10 mock menus
    const mockMenus = Array.from({ length: 10 }, () => ({
      id: uuidv4(),
      name: `Test Menu ${Math.floor(Math.random() * 1000)}`,
      description: 'Test Menu Description',
      restaurantId: uuidv4(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    return {
      items: mockMenus,
      total: 10,
      page: 1,
      limit: 10,
      pages: 1
    };
  }

  /**
   * Simple health check endpoint for load testing
   */
  @Get('health')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Simplified health check for load testing' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-10-12T15:21:20.123Z' }
      }
    }
  })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Get a specific menu by ID for load testing
   */
  @Get('menus/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get a specific menu by ID for load testing' })
  @ApiParam({ name: 'id', description: 'Menu ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns mock menu data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        restaurantId: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async getMenuById(@Param('id') id: string) {
    // For load testing, we just return a mock menu with the requested ID
    return {
      id: id,
      name: `Test Menu ${Math.floor(Math.random() * 1000)}`,
      description: 'Test Menu Description',
      restaurantId: uuidv4(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get a specific category by ID for load testing
   */
  @Get('categories/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get a specific category by ID for load testing' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns mock category data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        menuId: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async getCategoryById(@Param('id') id: string) {
    // For load testing, we just return a mock category with the requested ID
    return {
      id: id,
      name: `Test Category ${Math.floor(Math.random() * 1000)}`,
      description: 'Test Category Description',
      menuId: uuidv4(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get a specific menu item by ID for load testing
   */
  @Get('menu-items/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get a specific menu item by ID for load testing' })
  @ApiParam({ name: 'id', description: 'Menu Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns mock menu item data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        categoryId: { type: 'string' },
        available: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async getMenuItemById(@Param('id') id: string) {
    // For load testing, we just return a mock menu item with the requested ID
    return {
      id: id,
      name: `Test Menu Item ${Math.floor(Math.random() * 1000)}`,
      description: 'Test Menu Item Description',
      price: 9.99 + Math.random() * 10,
      categoryId: uuidv4(),
      available: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update a menu for load testing
   */
  @Put('menus/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Update a menu for load testing' })
  @ApiParam({ name: 'id', description: 'Menu ID' })
  @ApiBody({ type: UpdateMenuDto })
  @ApiResponse({
    status: 200,
    description: 'Returns updated mock menu data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        active: { type: 'boolean' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async updateMenu(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return {
      id,
      name: updateMenuDto.name || `Updated Menu ${Math.floor(Math.random() * 1000)}`,
      description: updateMenuDto.description || 'Updated Test Menu Description',
      active: updateMenuDto.active !== undefined ? updateMenuDto.active : true,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update a category for load testing
   */
  @Put('categories/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Update a category for load testing' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Returns updated mock category data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        active: { type: 'boolean' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return {
      id,
      name: updateCategoryDto.name || `Updated Category ${Math.floor(Math.random() * 1000)}`,
      description: updateCategoryDto.description || 'Updated Test Category Description',
      active: updateCategoryDto.active !== undefined ? updateCategoryDto.active : true,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update a menu item for load testing
   */
  @Put('menu-items/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Update a menu item for load testing' })
  @ApiParam({ name: 'id', description: 'Menu Item ID' })
  @ApiBody({ type: UpdateMenuItemDto })
  @ApiResponse({
    status: 200,
    description: 'Returns updated mock menu item data',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        available: { type: 'boolean' },
        updatedAt: { type: 'string' }
      }
    }
  })
  async updateMenuItem(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return {
      id,
      name: updateMenuItemDto.name,
      description: 'Updated Test Menu Item Description',
      price: updateMenuItemDto.price,
      available: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete a menu for load testing
   */
  @Delete('menus/:id')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a menu for load testing' })
  @ApiParam({ name: 'id', description: 'Menu ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu deleted successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  deleteMenu(@Param('id') id: string) {
    return {
      id,
      deleted: true,
      message: `Menu ${id} deleted successfully`,
    };
  }

  /**
   * Delete a category for load testing
   */
  @Delete('categories/:id')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category for load testing' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  deleteCategory(@Param('id') id: string) {
    return {
      id,
      deleted: true,
      message: `Category ${id} deleted successfully`,
    };
  }

  /**
   * Delete a menu item for load testing
   */
  @Delete('menu-items/:id')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a menu item for load testing' })
  @ApiParam({ name: 'id', description: 'Menu Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Menu item deleted successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  deleteMenuItem(@Param('id') id: string) {
    return {
      id,
      deleted: true,
      message: `Menu item ${id} deleted successfully`,
    };
  }
} 