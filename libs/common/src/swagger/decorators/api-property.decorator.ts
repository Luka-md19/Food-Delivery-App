import { ApiProperty as NestApiProperty, ApiPropertyOptions, ApiPropertyOptional as NestApiPropertyOptional } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Custom options interface extending ApiPropertyOptions
 */
export interface ExtendedApiPropertyOptions extends Omit<ApiPropertyOptions, 'type'> {
  type?: Type<unknown> | [Type<unknown>] | Function | [Function] | string;
  isId?: boolean;
}

/**
 * Extended ApiProperty decorator with additional features
 * This decorator extends the standard Swagger ApiProperty decorator
 * with additional features like automatic example generation based on type
 */
export function ApiProperty(options?: ExtendedApiPropertyOptions) {
  const defaultOptions: Partial<ApiPropertyOptions> = {};
  
  // If this is an ID field, add some default options
  if (options?.isId) {
    defaultOptions.description = options.description || 'Unique identifier';
    defaultOptions.example = options.example || '507f1f77bcf86cd799439011';
    defaultOptions.format = options.format || 'mongo-id';
  }
  
  // If no example is provided, generate one based on the type
  if (!options?.example && options?.type) {
    if (options.type === String) {
      defaultOptions.example = 'example';
    } else if (options.type === Number) {
      defaultOptions.example = 0;
    } else if (options.type === Boolean) {
      defaultOptions.example = true;
    } else if (options.type === Date) {
      defaultOptions.example = new Date().toISOString();
    } else if (options.type === Array) {
      defaultOptions.example = [];
    } else if (options.type === Object) {
      defaultOptions.example = {};
    }
  }
  
  // Merge default options with provided options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };
  
  // Remove custom properties that are not part of ApiPropertyOptions
  const { isId, ...nestOptions } = mergedOptions;
  
  return NestApiProperty(nestOptions as ApiPropertyOptions);
}

/**
 * Extended ApiPropertyOptional decorator with additional features
 * This decorator extends the standard Swagger ApiPropertyOptional decorator
 * with additional features like automatic example generation based on type
 */
export function ApiPropertyOptional(options?: ExtendedApiPropertyOptions) {
  // Use the NestJS ApiPropertyOptional directly to avoid type issues
  const defaultOptions: Partial<ApiPropertyOptions> = {};
  
  // If this is an ID field, add some default options
  if (options?.isId) {
    defaultOptions.description = options.description || 'Unique identifier';
    defaultOptions.example = options.example || '507f1f77bcf86cd799439011';
    defaultOptions.format = options.format || 'mongo-id';
  }
  
  // If no example is provided, generate one based on the type
  if (!options?.example && options?.type) {
    if (options.type === String) {
      defaultOptions.example = 'example';
    } else if (options.type === Number) {
      defaultOptions.example = 0;
    } else if (options.type === Boolean) {
      defaultOptions.example = true;
    } else if (options.type === Date) {
      defaultOptions.example = new Date().toISOString();
    } else if (options.type === Array) {
      defaultOptions.example = [];
    } else if (options.type === Object) {
      defaultOptions.example = {};
    }
  }
  
  // Merge default options with provided options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };
  
  // Remove custom properties that are not part of ApiPropertyOptions
  const { isId, ...nestOptions } = mergedOptions;
  
  return NestApiPropertyOptional(nestOptions as ApiPropertyOptions);
} 