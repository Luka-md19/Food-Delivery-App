/**
 * Default time-to-live for rate limiting in seconds
 */
export const DEFAULT_TTL = 60;

/**
 * Default request limit per TTL period
 */
export const DEFAULT_LIMIT = 10;

/**
 * Rate limiting configurations for different microservices and their endpoints
 * This follows the Open/Closed Principle by allowing extension without modification
 */
export const RATE_LIMIT_CONFIGS = {
  AUTH: {
    // Authentication endpoints
    register: { ttl: 60, limit: 3 }, // 3 requests per minute
    login: { ttl: 60, limit: 3 }, // 3 requests per minute (reduced from 5)
    refresh: { ttl: 60, limit: 10 }, // 10 requests per minute
    
    // Password management
    forgotPassword: { ttl: 300, limit: 3 }, // 3 requests per 5 minutes
    resetPassword: { ttl: 300, limit: 3 }, // 3 requests per 5 minutes
    updatePassword: { ttl: 300, limit: 3 }, // 3 requests per 5 minutes
    
    // Account management
    deleteAccount: { ttl: 300, limit: 1 }, // 1 request per 5 minutes
    verifyEmail: { ttl: 300, limit: 3 }, // 3 requests per 5 minutes
    
    // Session management
    revokeSessions: { ttl: 60, limit: 5 }, // 5 requests per minute
  },
  
  MENU: {
    // Menu endpoints from MenuController
    findAll: { ttl: 60, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findById: { ttl: 60, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findByRestaurantId: { ttl: 60, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    create: { ttl: 60, limit: 20 }, // 20 requests per minute (standard for write operation)
    update: { ttl: 60, limit: 20 }, // 20 requests per minute (standard for write operation)
    delete: { ttl: 60, limit: 10 }, // 10 requests per minute (stricter for delete operation)
    addCategory: { ttl: 60, limit: 20 }, // 20 requests per minute (standard for write operation)
    removeCategory: { ttl: 60, limit: 10 }, // 10 requests per minute (stricter for delete operation)
    
    // Legacy menu configurations (keeping for backward compatibility)
    createMenu: { ttl: 60, limit: 10 }, // 10 requests per minute
    updateMenu: { ttl: 60, limit: 20 }, // 20 requests per minute
    deleteMenu: { ttl: 60, limit: 5 }, // 5 requests per minute
    
    // Category management
    createCategory: { ttl: 60, limit: 20 }, // 20 requests per minute
    updateCategory: { ttl: 60, limit: 20 }, // 20 requests per minute
    deleteCategory: { ttl: 60, limit: 10 }, // 10 requests per minute
    
    // Item management
    createItem: { ttl: 60, limit: 30 }, // 30 requests per minute
    updateItem: { ttl: 60, limit: 30 }, // 30 requests per minute
    deleteItem: { ttl: 60, limit: 15 }, // 15 requests per minute
    
    // Read operations (higher limits)
    getMenus: { ttl: 60, limit: 100 }, // 100 requests per minute
    getCategories: { ttl: 60, limit: 100 }, // 100 requests per minute
    getItems: { ttl: 60, limit: 100 }, // 100 requests per minute
  },
  
  // Default configurations for different types of operations
  DEFAULT: {
    // Different tiers of rate limiting
    strict: { ttl: 60, limit: 5 }, // Very limited access
    standard: { ttl: 60, limit: 20 }, // Standard access
    relaxed: { ttl: 60, limit: 50 }, // Higher access for read operations
    
    // Different time windows
    perSecond: { ttl: 1, limit: 2 }, // 2 requests per second
    perMinute: { ttl: 60, limit: 30 }, // 30 requests per minute
    per5Minutes: { ttl: 300, limit: 100 }, // 100 requests per 5 minutes
    perHour: { ttl: 3600, limit: 300 }, // 300 requests per hour
  }
} as const;

/**
 * Injection token for throttler options
 */
export const THROTTLER_OPTIONS = 'THROTTLER_OPTIONS';

/**
 * Storage types for rate limiting
 */
export enum ThrottlerStorageType {
  MEMORY = 'memory',
  REDIS = 'redis',
}

/**
 * Get rate limit configuration for a specific endpoint
 * @param path The request path
 * @param method The HTTP method (GET, POST, PUT, DELETE, etc.)
 * @returns Rate limit configuration or null if not found
 */
export function getRateLimitConfigForPath(path: string, method: string = 'GET'): { ttl: number; limit: number } | null {
  // Map of path patterns to rate limit configurations
  const pathMappings = [
    // Auth service endpoints
    { pattern: /^\/auth\/login$/, config: RATE_LIMIT_CONFIGS.AUTH.login },
    { pattern: /^\/auth\/register$/, config: RATE_LIMIT_CONFIGS.AUTH.register },
    { pattern: /^\/auth\/refresh$/, config: RATE_LIMIT_CONFIGS.AUTH.refresh },
    { pattern: /^\/auth\/forgot-password$/, config: RATE_LIMIT_CONFIGS.AUTH.forgotPassword },
    { pattern: /^\/auth\/reset-password$/, config: RATE_LIMIT_CONFIGS.AUTH.resetPassword },
    { pattern: /^\/auth\/update-password$/, config: RATE_LIMIT_CONFIGS.AUTH.updatePassword },
    { pattern: /^\/auth\/delete-account$/, config: RATE_LIMIT_CONFIGS.AUTH.deleteAccount },
    { pattern: /^\/auth\/verify-email$/, config: RATE_LIMIT_CONFIGS.AUTH.verifyEmail },
    { pattern: /^\/auth\/revoke-sessions$/, config: RATE_LIMIT_CONFIGS.AUTH.revokeSessions },
    
    // Menu service endpoints
    { pattern: /^\/menu$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findAll },
    { pattern: /^\/menu\/[a-zA-Z0-9-]+$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findById },
    { pattern: /^\/menu\/restaurant\/[a-zA-Z0-9-]+$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findByRestaurantId },
    { pattern: /^\/menu$/, method: 'POST', config: RATE_LIMIT_CONFIGS.MENU.create },
    { pattern: /^\/menu\/[a-zA-Z0-9-]+$/, method: 'PUT', config: RATE_LIMIT_CONFIGS.MENU.update },
    { pattern: /^\/menu\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.MENU.delete },
    { pattern: /^\/menu\/[a-zA-Z0-9-]+\/categories$/, method: 'POST', config: RATE_LIMIT_CONFIGS.MENU.addCategory },
    { pattern: /^\/menu\/[a-zA-Z0-9-]+\/categories\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.MENU.removeCategory },
  ];
  
  // Find the first matching pattern with matching method
  for (const mapping of pathMappings) {
    if (mapping.pattern.test(path) && (!mapping.method || mapping.method === method)) {
      return mapping.config;
    }
  }
  
  // Special case for menu endpoints
  if (path.startsWith('/menu')) {
    return RATE_LIMIT_CONFIGS.MENU.findAll;
  }
  
  // Default rate limit if no specific configuration is found
  return {
    ttl: DEFAULT_TTL,
    limit: DEFAULT_LIMIT,
  };
} 