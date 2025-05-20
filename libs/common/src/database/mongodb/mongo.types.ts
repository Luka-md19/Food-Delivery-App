import { Document as MongoDocument } from 'mongodb';

/**
 * Base interface for MongoDB document with common fields
 */
export interface BaseDocument extends MongoDocument {
  _id: any;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

/**
 * Filter options for pagination
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Response format for paginated queries
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
} 