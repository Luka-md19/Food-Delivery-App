import { Injectable, BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

/**
 * A service dedicated to validation logic
 */
@Injectable()
export class ValidatorService {
  /**
   * Validate that a string is a valid ObjectId
   * @param id The ID to validate
   * @throws BadRequestException if ID is invalid
   */
  public validateObjectId(id: string): void {
    if (!id) {
      throw new BadRequestException('ID is required');
    }
    
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
  }

  /**
   * Standardize pagination parameters
   * @param page Page number (1-indexed)
   * @param limit Number of items per page
   * @param maxLimit Maximum allowed limit
   * @returns Normalized pagination parameters
   */
  public validatePagination(page = 1, limit = 10, maxLimit = 100): { page: number, limit: number } {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > maxLimit) limit = maxLimit; // Prevent excessive data retrieval
    
    return { page, limit };
  }

  /**
   * Validate that a value is not empty
   * @param value The value to check
   * @param fieldName Name of the field for the error message
   * @throws BadRequestException if value is empty
   */
  public validateNotEmpty(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  /**
   * Validate that a value is within a specific range
   * @param value The value to check
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   * @param fieldName Name of the field for the error message
   * @throws BadRequestException if value is out of range
   */
  public validateRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new BadRequestException(`${fieldName} must be between ${min} and ${max}`);
    }
  }
} 