import { Request } from 'express';

/**
 * DTO for storing failed HTTP requests
 * This follows the Single Responsibility Principle by encapsulating the formatting logic for failed requests
 */
export class FailedRequestDto {
  /**
   * Event pattern derived from the HTTP method and path
   */
  readonly pattern: string;

  /**
   * Request payload including body, params, query, etc.
   */
  readonly payload: Record<string, any>;

  constructor(request: Request, errorMessage: string) {
    const { method, url, body, params, query, headers } = request;
    
    this.pattern = `${method}.${url}`;
    this.payload = {
      body,
      params,
      query,
      headers: this.sanitizeHeaders(headers),
      method,
      path: url,
      errorMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Remove sensitive information from headers
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove potentially sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    
    return sanitized;
  }
} 