import { DEFAULT_LIMIT, DEFAULT_TTL, RATE_LIMIT_CONFIGS } from './rate-limit-configs';

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
    
    // Category service endpoints
    { pattern: /^\/categories$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findAllCategories },
    { pattern: /^\/categories\/[a-zA-Z0-9-]+$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findCategoryById },
    { pattern: /^\/categories\/[a-zA-Z0-9-]+\/items\/[a-zA-Z0-9-]+$/, method: 'POST', config: RATE_LIMIT_CONFIGS.MENU.addItemToCategory },
    { pattern: /^\/categories\/[a-zA-Z0-9-]+\/items\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.MENU.removeItemFromCategory },
    
    // Menu items endpoints
    { pattern: /^\/menu-items$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findAllItems },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.findItemById },
    { pattern: /^\/menu-items$/, method: 'POST', config: RATE_LIMIT_CONFIGS.MENU.createItem },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+$/, method: 'PUT', config: RATE_LIMIT_CONFIGS.MENU.updateItem },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.MENU.deleteItem },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+\/availability$/, method: 'PATCH', config: RATE_LIMIT_CONFIGS.MENU.updateItemAvailability },
    
    // Menu item options endpoints
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+\/options$/, method: 'GET', config: RATE_LIMIT_CONFIGS.MENU.getItemOptions },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+\/options$/, method: 'POST', config: RATE_LIMIT_CONFIGS.MENU.addItemOption },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+\/options\/[a-zA-Z0-9-]+$/, method: 'PUT', config: RATE_LIMIT_CONFIGS.MENU.updateItemOption },
    { pattern: /^\/menu-items\/[a-zA-Z0-9-]+\/options\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.MENU.removeItemOption },
    
    // Restaurant endpoints
    { pattern: /^\/restaurants$/, method: 'GET', config: RATE_LIMIT_CONFIGS.RESTAURANT.findAll },
    { pattern: /^\/restaurants\/[a-zA-Z0-9-]+$/, method: 'GET', config: RATE_LIMIT_CONFIGS.RESTAURANT.findById },
    { pattern: /^\/restaurants$/, method: 'POST', config: RATE_LIMIT_CONFIGS.RESTAURANT.create },
    { pattern: /^\/restaurants\/[a-zA-Z0-9-]+$/, method: 'PUT', config: RATE_LIMIT_CONFIGS.RESTAURANT.update },
    { pattern: /^\/restaurants\/[a-zA-Z0-9-]+$/, method: 'DELETE', config: RATE_LIMIT_CONFIGS.RESTAURANT.delete },
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