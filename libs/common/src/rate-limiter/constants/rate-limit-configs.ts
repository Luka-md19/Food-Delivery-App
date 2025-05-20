/**
 * Default time-to-live for rate limiting in seconds
 */
export const DEFAULT_TTL = 60;

/**
 * Default request limit per TTL period
 */
export const DEFAULT_LIMIT = 100;

/**
 * Rate limiting configurations for different microservices and their endpoints
 * This follows the Open/Closed Principle by allowing extension without modification
 */
export const RATE_LIMIT_CONFIGS = {
  AUTH: {
    // Authentication endpoints
    register: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    login: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    refresh: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    serviceToken: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute for service token generation
    
    // Password management
    forgotPassword: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    resetPassword: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    updatePassword: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Account management
    deleteAccount: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    verifyEmail: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Session management
    revokeSessions: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
  },
  
  MENU: {
    // Menu endpoints from MenuController
    findAll: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findById: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findByRestaurantId: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    create: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    update: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    delete: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    addCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    removeCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Category endpoints
    findAllCategories: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findCategoryById: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    addItemToCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    removeItemFromCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Menu items endpoints
    findAllItems: { ttl: DEFAULT_TTL, limit: 100 },
    findItemById: { ttl: DEFAULT_TTL, limit: 100 },
    createItem: { ttl: DEFAULT_TTL, limit: 100 },
    updateItem: { ttl: DEFAULT_TTL, limit: 100 },
    deleteItem: { ttl: DEFAULT_TTL, limit: 100 },
    updateItemAvailability: { ttl: DEFAULT_TTL, limit: 100 },
    getItemOptions: { ttl: DEFAULT_TTL, limit: 100 },
    addItemOption: { ttl: DEFAULT_TTL, limit: 100 },
    updateItemOption: { ttl: DEFAULT_TTL, limit: 100 },
    removeItemOption: { ttl: DEFAULT_TTL, limit: 100 },
    searchItems: { ttl: DEFAULT_TTL, limit: 100 },
    
    // Admin endpoints
    getFailedMessages: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    retryMessage: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    retryAllMessages: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Legacy menu configurations (keeping for backward compatibility)
    createMenu: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    updateMenu: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    deleteMenu: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Category management
    createCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    updateCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    deleteCategory: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Read operations (higher limits)
    getMenus: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    getCategories: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    getItems: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
  },
  
  // Restaurant service endpoints
  RESTAURANT: {
    findAll: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    findById: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute (relaxed for read operation)
    create: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    update: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    delete: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
  },
  
  // Default configurations for different types of operations
  DEFAULT: {
    // Different tiers of rate limiting
    strict: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    standard: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    relaxed: { ttl: DEFAULT_TTL, limit: 100 }, // 100 requests per minute
    
    // Different time windows
    perSecond: { ttl: 1, limit: 100 }, // 100 requests per second
    perMinute: { ttl: 60, limit: 100 }, // 100 requests per minute
    per5Minutes: { ttl: 300, limit: 100 }, // 100 requests per 5 minutes
    perHour: { ttl: 3600, limit: 300 }, // 300 requests per hour
  }
} as const; 