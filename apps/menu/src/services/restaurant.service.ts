import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { RestaurantNotFoundException } from '../domain/exceptions';
import { ErrorHandlerService, ValidationException, ValidatorService } from '@app/common/exceptions';
import { CreateRestaurantDto, UpdateRestaurantDto, RestaurantResponseDto } from '../dto';
import { Restaurant } from '../domain/entities/restaurant.entity';
import { LoggerFactory } from '@app/common/logger';
import { RestaurantRepository } from '../domain/repositories/restaurant/restaurant.repository';

@Injectable()
export class RestaurantService implements OnModuleInit {
  private readonly logger = LoggerFactory.getLogger(RestaurantService.name);

  constructor(
    @Inject('IRestaurantDomainRepository') private restaurantRepository: RestaurantRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly validator: ValidatorService,
    private readonly eventBus: EventBus
  ) {}

  async onModuleInit() {
    this.logger.log('RestaurantService initialized');
  }

  /**
   * Create a new restaurant
   * @param createRestaurantDto Restaurant data
   */
  async create(createRestaurantDto: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    try {
      // Validate dto - use manually instead of validator.validate
      const validationErrors = await this.validateDto(createRestaurantDto);
      if (validationErrors.length > 0) {
        throw new ValidationException('Validation failed: ' + validationErrors.join(', '));
      }
      
      // Create restaurant entity
      const restaurant = Restaurant.create({
        name: createRestaurantDto.name,
        description: createRestaurantDto.description,
        address: createRestaurantDto.address,
        phone: createRestaurantDto.phone,
        email: createRestaurantDto.email,
        website: createRestaurantDto.website,
        openingHours: createRestaurantDto.openingHours,
        active: createRestaurantDto.active,
        cuisineTypes: createRestaurantDto.cuisineTypes,
        tags: createRestaurantDto.tags,
        priceRange: createRestaurantDto.priceRange,
        metadata: createRestaurantDto.metadata,
      });
      
      // Save to repository
      const savedRestaurant = await this.restaurantRepository.create(restaurant);
      
      // Return DTO
      return this.mapToDto(savedRestaurant);
    } catch (error) {
      this.logger.error(`Error creating restaurant: ${error.message}`, error.stack);
      throw this.errorHandler.handleError(error, 'Error creating restaurant', [RestaurantNotFoundException, ValidationException]);
    }
  }

  /**
   * Find all restaurants with optional filtering and pagination
   * @param page Page number (starting from 1)
   * @param limit Items per page
   * @param filter Optional filter criteria
   */
  async findAll(
    page = 1,
    limit = 10,
    filter: any = {}
  ): Promise<{
    items: RestaurantResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      // Validate pagination - implement manually
      const validPage = Math.max(1, page);
      const validLimit = Math.min(100, Math.max(1, limit));
      
      // Process the filter to handle any special cases
      const processedFilter = { ...filter };
      
      // Apply filter
      const [restaurants, total] = await Promise.all([
        this.restaurantRepository.findAll(processedFilter),
        this.restaurantRepository.count(processedFilter)
      ]);
      
      // Calculate metadata
      const pages = Math.ceil(total / validLimit);
      
      // Map to DTOs
      const items = restaurants.map(restaurant => this.mapToDto(restaurant));
      
      return {
        items,
        total,
        page: validPage,
        limit: validLimit,
        pages
      };
    } catch (error) {
      this.logger.error(`Error finding restaurants: ${error.message}`, error.stack);
      throw this.errorHandler.handleError(error, 'Error finding restaurants', [RestaurantNotFoundException, ValidationException]);
    }
  }

  /**
   * Find a restaurant by ID
   * @param id Restaurant ID
   */
  async findById(id: string): Promise<RestaurantResponseDto> {
    try {
      // Validate ID manually
      this.validateId(id);
      
      // Find restaurant
      const restaurant = await this.restaurantRepository.findById(id);
      
      // Map to DTO
      return this.mapToDto(restaurant);
    } catch (error) {
      this.logger.error(`Error finding restaurant by ID ${id}: ${error.message}`, error.stack);
      throw this.errorHandler.handleError(error, `Error finding restaurant with ID ${id}`, [RestaurantNotFoundException, ValidationException]);
    }
  }

  /**
   * Update a restaurant
   * @param id Restaurant ID
   * @param updateRestaurantDto Updated restaurant data
   */
  async update(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<RestaurantResponseDto> {
    try {
      // Validate ID and DTO
      this.validateId(id);
      const validationErrors = await this.validateDto(updateRestaurantDto);
      if (validationErrors.length > 0) {
        throw new ValidationException('Validation failed: ' + validationErrors.join(', '));
      }
      
      // Check for no-op updates
      if (Object.keys(updateRestaurantDto).length === 0) {
        const restaurant = await this.restaurantRepository.findById(id);
        return this.mapToDto(restaurant);
      }
      
      // Update restaurant
      const updatedRestaurant = await this.restaurantRepository.update(id, updateRestaurantDto);
      
      // Map to DTO
      return this.mapToDto(updatedRestaurant);
    } catch (error) {
      this.logger.error(`Error updating restaurant ${id}: ${error.message}`, error.stack);
      throw this.errorHandler.handleError(error, `Error updating restaurant with ID ${id}`, [RestaurantNotFoundException, ValidationException]);
    }
  }

  /**
   * Delete a restaurant
   * @param id Restaurant ID
   */
  async delete(id: string): Promise<void> {
    try {
      // Validate ID
      this.validateId(id);
      
      // Delete restaurant
      await this.restaurantRepository.delete(id);
    } catch (error) {
      this.logger.error(`Error deleting restaurant ${id}: ${error.message}`, error.stack);
      throw this.errorHandler.handleError(error, `Error deleting restaurant with ID ${id}`, [RestaurantNotFoundException, ValidationException]);
    }
  }

  /**
   * Map a restaurant entity to a DTO
   * @param restaurant Restaurant entity
   */
  private mapToDto(restaurant: Restaurant): RestaurantResponseDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      openingHours: restaurant.openingHours,
      active: restaurant.active,
      cuisineTypes: restaurant.cuisineTypes,
      tags: restaurant.tags,
      priceRange: restaurant.priceRange,
      metadata: restaurant.metadata,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt
    };
  }
  
  /**
   * Validate a DTO object
   * @param dto The DTO to validate
   * @returns Array of validation errors
   */
  private async validateDto(dto: any): Promise<string[]> {
    // Simple implementation
    const errors: string[] = [];
    
    // For CreateRestaurantDto, validate required fields
    if ('name' in dto && (!dto.name || typeof dto.name !== 'string')) {
      errors.push('Name is required and must be a string');
    }
    
    // Add more validations as needed
    
    return errors;
  }
  
  /**
   * Validate an ID
   * @param id The ID to validate
   * @throws ValidationException if the ID is invalid
   */
  private validateId(id: string): void {
    if (!id) {
      throw new ValidationException('ID is required');
    }
    
    // Check if it's a valid MongoDB ObjectId (if using MongoDB)
    // This is a simple regex for MongoDB ObjectId validation
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new ValidationException(`Invalid ID format: ${id}`);
    }
  }
} 