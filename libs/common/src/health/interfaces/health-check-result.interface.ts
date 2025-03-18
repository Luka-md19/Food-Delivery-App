/**
 * Interface for health check result
 */
export interface HealthCheckResult {
  /**
   * Overall status of the service
   * - ok: All dependencies are available
   * - degraded: Some dependencies are unavailable but service can still function
   * - down: Service cannot function properly
   */
  status: 'ok' | 'degraded' | 'down';
  
  /**
   * Timestamp of the health check
   */
  timestamp: string;
  
  /**
   * Name of the service
   */
  service: string;
  
  /**
   * Version of the service
   */
  version: string;
  
  /**
   * Port the service is running on
   */
  port: number;
  
  /**
   * Environment the service is running in (development, production, etc.)
   */
  environment: string;
  
  /**
   * Status of dependencies
   */
  dependencies: {
    /**
     * RabbitMQ connection status
     */
    rabbitmq?: 'connected' | 'disconnected';
    
    /**
     * Database connection status
     */
    database?: 'connected' | 'disconnected';
    
    /**
     * Redis connection status
     */
    redis?: 'connected' | 'disconnected';
    
    /**
     * Any other dependencies
     */
    [key: string]: 'connected' | 'disconnected' | undefined;
  };
} 