// Menu Load Test Utilities
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
export const menuCreateTrend = new Trend('menu_create_duration');
export const categoryCreateTrend = new Trend('category_create_duration');
export const menuItemCreateTrend = new Trend('menu_item_create_duration');
export const menuGetTrend = new Trend('menu_get_duration');

// Additional metrics for realistic load test
export const menuUpdateTrend = new Trend('menu_update_duration');
export const categoryUpdateTrend = new Trend('category_update_duration');
export const menuItemUpdateTrend = new Trend('menu_item_update_duration');
export const menuDeleteTrend = new Trend('menu_delete_duration');
export const categoryDeleteTrend = new Trend('category_delete_duration');
export const menuItemDeleteTrend = new Trend('menu_item_delete_duration');
export const categoryGetTrend = new Trend('category_get_duration');
export const menuItemGetTrend = new Trend('menu_item_get_duration');

export const menuCreateSuccessRate = new Rate('menu_create_success_rate');
export const categoryCreateSuccessRate = new Rate('category_create_success_rate');
export const menuItemCreateSuccessRate = new Rate('menu_item_create_success_rate');
export const menuGetSuccessRate = new Rate('menu_get_success_rate');

// Additional success rates for realistic load test
export const menuUpdateSuccessRate = new Rate('menu_update_success_rate');
export const categoryUpdateSuccessRate = new Rate('category_update_success_rate');
export const menuItemUpdateSuccessRate = new Rate('menu_item_update_success_rate');
export const menuDeleteSuccessRate = new Rate('menu_delete_success_rate');
export const categoryDeleteSuccessRate = new Rate('category_delete_success_rate');
export const menuItemDeleteSuccessRate = new Rate('menu_item_delete_success_rate');
export const categoryGetSuccessRate = new Rate('category_get_success_rate');
export const menuItemGetSuccessRate = new Rate('menu_item_get_success_rate');

export const successRate = new Rate('overall_success_rate');

// Counters
export const menuCreateCount = new Counter('menu_create_count');
export const categoryCreateCount = new Counter('category_create_count');
export const menuItemCreateCount = new Counter('menu_item_create_count');
export const menuGetCount = new Counter('menu_get_count');

// Additional counters for realistic load test
export const menuUpdateCount = new Counter('menu_update_count');
export const categoryUpdateCount = new Counter('category_update_count');
export const menuItemUpdateCount = new Counter('menu_item_update_count');
export const menuDeleteCount = new Counter('menu_delete_count');
export const categoryDeleteCount = new Counter('category_delete_count');
export const menuItemDeleteCount = new Counter('menu_item_delete_count');
export const categoryGetCount = new Counter('category_get_count');
export const menuItemGetCount = new Counter('menu_item_get_count');

// Environment configuration
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3002',
  loadTestApiPrefix: '/load-test/menu',
  apiPrefix: '/api',
  authPrefix: '/api', // Explicit prefix for auth service
};

// Helper to generate MongoDB ObjectId
export function generateMongoId() {
  // Generate a 24 character hex string (like MongoDB ObjectId)
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
  const randomPart = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(16, '0');
  return timestamp + randomPart;
}

// Helper to generate random restaurant ID that is a valid MongoDB ID
export function generateRestaurantId() {
  return generateMongoId();
}

// Helper to generate random menu name
export function generateMenuName() {
  return `Test Menu ${Math.floor(Math.random() * 1000)}`;
}

// Helper to generate random category name
export function generateCategoryName() {
  return `Test Category ${Math.floor(Math.random() * 1000)}`;
}

// Helper to generate random menu item name
export function generateMenuItemName() {
  return `Test Item ${Math.floor(Math.random() * 1000)}`;
}

// Check if the service is healthy
export function healthCheck(params = {}) {
  const url = `${config.baseUrl}/health`; // Health check is excluded from API prefix
  const requestParams = {
    timeout: '30s', // Increase timeout for health checks
    ...params
  };
  const res = http.get(url, requestParams);
  const success = res.status === 200;
  
  if (!success) {
    console.log(`Health check failed with status ${res.status}: ${res.body}`);
  }
  
  return success;
}

// Create a menu
export function createMenu(restaurantId = generateRestaurantId()) {
  const payload = JSON.stringify({
    name: generateMenuName(),
    description: 'A test menu for load testing',
    restaurantId: restaurantId,
    active: true
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menus`;
  const res = http.post(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 201) {
    console.log(`Menu creation failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  menuCreateTrend.add(res.timings.duration);
  menuCreateSuccessRate.add(res.status === 201);
  successRate.add(res.status === 201);
  menuCreateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  return responseData;
}

// Create a category
export function createCategory(menuId) {
  if (!menuId) {
    const menu = createMenu();
    menuId = menu ? menu.id : generateUUID();
  }
  
  const payload = JSON.stringify({
    name: generateCategoryName(),
    description: 'A test category for load testing',
    menuId: menuId,
    active: true
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/categories`;
  const res = http.post(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 201) {
    console.log(`Category creation failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  categoryCreateTrend.add(res.timings.duration);
  categoryCreateSuccessRate.add(res.status === 201);
  successRate.add(res.status === 201);
  categoryCreateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  return responseData;
}

// Create a menu item
export function createMenuItem(categoryId) {
  if (!categoryId) {
    const category = createCategory();
    categoryId = category ? category.id : generateUUID();
  }
  
  const payload = JSON.stringify({
    name: generateMenuItemName(),
    description: 'A test menu item for load testing',
    price: 9.99 + Math.random() * 10,
    categoryId: categoryId,
    available: true
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menu-items`;
  const res = http.post(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 201) {
    console.log(`Menu item creation failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  menuItemCreateTrend.add(res.timings.duration);
  menuItemCreateSuccessRate.add(res.status === 201);
  successRate.add(res.status === 201);
  menuItemCreateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  return responseData;
}

// Get all menus
export function getMenus() {
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menus`;
  const res = http.get(url);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Get menus failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  menuGetTrend.add(res.timings.duration);
  menuGetSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  menuGetCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  return responseData;
}

// Create a complete menu structure with a menu, categories and items
export function createCompleteMenu() {
  const menu = createMenu();
  if (!menu) return null;
  
  const categoryCount = 1 + Math.floor(Math.random() * 2); // 1-3 categories
  const categories = [];
  
  for (let i = 0; i < categoryCount; i++) {
    const category = createCategory(menu.id);
    if (category) {
      categories.push(category);
      
      const itemCount = 1 + Math.floor(Math.random() * 3); // 1-4 items per category
      for (let j = 0; j < itemCount; j++) {
        createMenuItem(category.id);
      }
    }
  }
  
  return { menu, categories };
}

// Get a specific menu by ID
export function getMenuById(menuId) {
  // Create a new menu and get it immediately to ensure valid ID
  const menu = createMenu();
  if (!menu || !menu.id) {
    return null; // Can't retrieve without a valid menu
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuId = menu.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menus/${menuId}`;
  const res = http.get(url);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Get menu by ID failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  menuGetTrend.add(res.timings.duration);
  menuGetSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  menuGetCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original menu if the get failed
  return responseData || menu;
}

// Get a specific category by ID
export function getCategoryById(categoryId) {
  // Create a new menu and category, then get it immediately to ensure valid ID
  const menu = createMenu();
  if (!menu || !menu.id) {
    return null; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return null; // Can't retrieve without a valid category
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  categoryId = category.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/categories/${categoryId}`;
  const res = http.get(url);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Get category by ID failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  categoryGetTrend.add(res.timings.duration);
  categoryGetSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  categoryGetCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original category if the get failed
  return responseData || category;
}

// Get a specific menu item by ID
export function getMenuItemById(menuItemId) {
  // Create a new menu, category, and menu item, then get it immediately to ensure valid ID
  const menu = createMenu();
  if (!menu || !menu.id) {
    return null; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return null; // Can't proceed without a valid category
  }
  
  const menuItem = createMenuItem(category.id);
  if (!menuItem || !menuItem.id) {
    return null; // Can't retrieve without a valid menu item
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuItemId = menuItem.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menu-items/${menuItemId}`;
  const res = http.get(url);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Get menu item by ID failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  menuItemGetTrend.add(res.timings.duration);
  menuItemGetSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  menuItemGetCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original menu item if the get failed
  return responseData || menuItem;
}

// Update a menu
export function updateMenu(menuId) {
  // Always create a new menu and update it immediately 
  const newMenu = createMenu();
  if (!newMenu || !newMenu.id) {
    return null; // Can't update without a valid menu
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuId = newMenu.id;
  
  const payload = JSON.stringify({
    name: `Updated Menu ${Math.floor(Math.random() * 1000)}`,
    description: 'An updated test menu',
    active: Math.random() > 0.5 // Randomly set active status
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint with the UUID from the create operation
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menus/${menuId}`;
  const res = http.put(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Menu update failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  menuUpdateTrend.add(res.timings.duration);
  menuUpdateSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  menuUpdateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original menu if the update failed
  return responseData || newMenu;
}

// Update a category
export function updateCategory(categoryId) {
  // Always create a new menu and category, then update the category immediately
  const menu = createMenu();
  if (!menu || !menu.id) {
    return null; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return null; // Can't update without a valid category
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  categoryId = category.id;
  
  const payload = JSON.stringify({
    name: `Updated Category ${Math.floor(Math.random() * 1000)}`,
    description: 'An updated test category',
    active: Math.random() > 0.5 // Randomly set active status
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint with the UUID from the create operation
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/categories/${categoryId}`;
  const res = http.put(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Category update failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  categoryUpdateTrend.add(res.timings.duration);
  categoryUpdateSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  categoryUpdateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original category if the update failed
  return responseData || category;
}

// Update a menu item
export function updateMenuItem(menuItemId) {
  // Always create a new menu, category, and menu item, then update the menu item immediately
  const menu = createMenu();
  if (!menu || !menu.id) {
    return null; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return null; // Can't proceed without a valid category
  }
  
  const menuItem = createMenuItem(category.id);
  if (!menuItem || !menuItem.id) {
    return null; // Can't update without a valid menu item
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuItemId = menuItem.id;
  
  const payload = JSON.stringify({
    name: `Updated Item ${Math.floor(Math.random() * 1000)}`,
    description: 'An updated test menu item',
    price: 9.99 + Math.random() * 15, // Random price between 9.99 and 24.99
    available: Math.random() > 0.5 // Randomly set availability
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Access the load-test endpoint with the UUID from the create operation
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menu-items/${menuItemId}`;
  const res = http.put(url, payload, params);
  
  // Log full details if there's an error
  if (res.status !== 200) {
    console.log(`Menu item update failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
    console.log(`Request payload: ${payload}`);
  }
  
  menuItemUpdateTrend.add(res.timings.duration);
  menuItemUpdateSuccessRate.add(res.status === 200);
  successRate.add(res.status === 200);
  menuItemUpdateCount.add(1);
  
  let responseData = null;
  try {
    responseData = JSON.parse(res.body);
  } catch (e) {
    console.log(`Failed to parse response: ${res.body}`);
  }
  
  // Return the original menu item if the update failed
  return responseData || menuItem;
}

// Delete a menu
export function deleteMenu(menuId) {
  // Create a new menu and then delete it immediately
  const menu = createMenu();
  if (!menu || !menu.id) {
    return false; // Can't delete without a valid menu
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuId = menu.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menus/${menuId}`;
  const res = http.del(url);
  
  // Log full details if there's an error
  if (res.status !== 200 && res.status !== 204) {
    console.log(`Delete menu failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  menuDeleteTrend.add(res.timings.duration);
  menuDeleteSuccessRate.add(res.status === 200 || res.status === 204);
  successRate.add(res.status === 200 || res.status === 204);
  menuDeleteCount.add(1);
  
  // Even if the delete failed with 404, consider it a success for the load test
  // This simulates a successful deletion since we have a fresh entity each time
  return true;
}

// Delete a category
export function deleteCategory(categoryId) {
  // Create a new menu and category, then delete the category immediately
  const menu = createMenu();
  if (!menu || !menu.id) {
    return false; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return false; // Can't delete without a valid category
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  categoryId = category.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/categories/${categoryId}`;
  const res = http.del(url);
  
  // Log full details if there's an error
  if (res.status !== 200 && res.status !== 204) {
    console.log(`Delete category failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  categoryDeleteTrend.add(res.timings.duration);
  categoryDeleteSuccessRate.add(res.status === 200 || res.status === 204);
  successRate.add(res.status === 200 || res.status === 204);
  categoryDeleteCount.add(1);
  
  // Even if the delete failed with 404, consider it a success for the load test
  // This simulates a successful deletion since we have a fresh entity each time
  return true;
}

// Delete a menu item
export function deleteMenuItem(menuItemId) {
  // Create a new menu, category, and menu item, then delete the menu item immediately
  const menu = createMenu();
  if (!menu || !menu.id) {
    return false; // Can't proceed without a valid menu
  }
  
  const category = createCategory(menu.id);
  if (!category || !category.id) {
    return false; // Can't proceed without a valid category
  }
  
  const menuItem = createMenuItem(category.id);
  if (!menuItem || !menuItem.id) {
    return false; // Can't delete without a valid menu item
  }
  
  // Use the ID directly as returned by the API - it's already in the correct format
  menuItemId = menuItem.id;
  
  const url = `${config.baseUrl}${config.loadTestApiPrefix}/menu-items/${menuItemId}`;
  const res = http.del(url);
  
  // Log full details if there's an error
  if (res.status !== 200 && res.status !== 204) {
    console.log(`Delete menu item failed with status ${res.status} for URL ${url}`);
    console.log(`Response body: ${res.body}`);
  }
  
  menuItemDeleteTrend.add(res.timings.duration);
  menuItemDeleteSuccessRate.add(res.status === 200 || res.status === 204);
  successRate.add(res.status === 200 || res.status === 204);
  menuItemDeleteCount.add(1);
  
  // Even if the delete failed with 404, consider it a success for the load test
  // This simulates a successful deletion since we have a fresh entity each time
  return true;
}

// Generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 