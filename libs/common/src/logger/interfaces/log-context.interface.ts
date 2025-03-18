/**
 * Context information to be included in logs
 */
export interface LogContext {
  /**
   * Request ID for tracking requests across services
   */
  requestId?: string;

  /**
   * Correlation ID for tracking related events
   */
  correlationId?: string;

  /**
   * User ID for tracking user-specific events
   */
  userId?: string;

  /**
   * Service name
   */
  service?: string;

  /**
   * Additional context information
   */
  [key: string]: any;
} 