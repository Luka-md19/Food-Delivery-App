import { ServiceMetrics } from '../services/health-check.service';

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
   * Unique identifier for this service instance
   */
  instanceId: string;
  
  /**
   * Hostname of this service instance
   */
  hostname: string;
  
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
  dependencies: Record<string, 'connected' | 'disconnected'>;
  
  /**
   * Performance metrics for this instance
   */
  metrics?: ServiceMetrics;
} 