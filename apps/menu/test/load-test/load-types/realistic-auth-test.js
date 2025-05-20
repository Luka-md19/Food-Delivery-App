import { sleep } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  getMenuById,
  getCategoryById,
  getMenuItemById,
  updateMenu,
  updateCategory,
  updateMenuItem,
  deleteMenuItem,
  deleteCategory,
  deleteMenu,
  // Import all functions directly to make sure they're available
  menuGetTrend,
  menuGetSuccessRate,
  successRate,
  menuGetCount,
  config,
  createCompleteMenu  // Make sure this is imported
} from './utils.js';

// Define the realistic load test configuration
export const options = {
  // Configuration using stages for realistic traffic patterns with high load
  // Modified for Windows to avoid socket exhaustion
  stages: [
    { duration: '2m', target: 50 },      // Gentle ramp-up to 50 users
    { duration: '3m', target: 200 },     // Ramp-up to 200 users
    { duration: '5m', target: 300 },     // Ramp-up to 300 users (reduced from 500)
    { duration: '10m', target: 500 },    // Peak load of 500 users (reduced from 1000)
    { duration: '8m', target: 300 },     // Scale back to 300 users
    { duration: '2m', target: 0 }        // Gradual ramp-down to 0
  ],
  
  // Connection management settings for Windows
  setupTimeout: '60s',
  teardownTimeout: '60s',
  insecureSkipTLSVerify: true,
  
  // Thresholds for test success/failure criteria
  thresholds: {
    // Response time thresholds
    'menu_get_duration': ['p(95)<2000', 'p(99)<4000'],       
    'menu_create_duration': ['p(95)<3000', 'p(99)<5000'],    
    'menu_update_duration': ['p(95)<3000', 'p(99)<5000'],    
    'menu_delete_duration': ['p(95)<3000', 'p(99)<5000'],    
    
    'category_get_duration': ['p(95)<2000', 'p(99)<4000'],   
    'category_create_duration': ['p(95)<3000', 'p(99)<5000'],
    'category_update_duration': ['p(95)<3000', 'p(99)<5000'],
    'category_delete_duration': ['p(95)<3000', 'p(99)<5000'],
    
    'menu_item_get_duration': ['p(95)<2000', 'p(99)<4000'],   
    'menu_item_create_duration': ['p(95)<3000', 'p(99)<5000'],
    'menu_item_update_duration': ['p(95)<3000', 'p(99)<5000'],
    'menu_item_delete_duration': ['p(95)<3000', 'p(99)<5000'],
    
    // Success rate thresholds
    'menu_create_success_rate': ['rate>0.95'],      
    'menu_get_success_rate': ['rate>0.98'],         
    'menu_update_success_rate': ['rate>0.95'],      
    'menu_delete_success_rate': ['rate>0.95'],      
    
    'category_create_success_rate': ['rate>0.95'],  
    'category_get_success_rate': ['rate>0.98'],     
    'category_update_success_rate': ['rate>0.95'],  
    'category_delete_success_rate': ['rate>0.95'],  
    
    'menu_item_create_success_rate': ['rate>0.95'], 
    'menu_item_get_success_rate': ['rate>0.98'],    
    'menu_item_update_success_rate': ['rate>0.95'], 
    'menu_item_delete_success_rate': ['rate>0.95'], 
    
    // Overall API performance
    'overall_success_rate': ['rate>0.95'],         
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
  },
};

// Auth service configuration
const authConfig = {
  baseUrl: __ENV.AUTH_URL || 'http://localhost:3000',
  loginEndpoint: '/api/load-test/auth/login',
  // Test user credentials
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'testuser@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'Password123!'
  }
};

// Token cache to avoid overwhelming auth service
let tokenCache = [];
const maxCachedTokens = 100;

// Helper function to authenticate and get a JWT token
function authenticate() {
  // Try to reuse a token from cache if available
  if (tokenCache.length > 0) {
    // Return a random token from the cache to distribute usage
    const randomIndex = Math.floor(Math.random() * tokenCache.length);
    return tokenCache[randomIndex];
  }
  
  const payload = JSON.stringify({
    email: authConfig.testUser.email,
    password: authConfig.testUser.password
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '15s', // Increase timeout for auth requests
  };
  
  // Add retry logic - try up to 3 times with backoff
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const url = `${authConfig.baseUrl}${authConfig.loginEndpoint}`;
      const res = http.post(url, payload, params);
      
      // Check if authentication was successful - accept both 200 and 201 as success
      const success = check(res, {
        'authentication successful': (r) => r.status === 200 || r.status === 201,
        'received access token': (r) => {
          try {
            const data = JSON.parse(r.body);
            // Handle both direct accessToken and nested tokens.accessToken
            return data.accessToken !== undefined || (data.tokens && data.tokens.accessToken !== undefined);
          } catch (e) {
            return false;
          }
        },
      });
      
      if (success) {
        try {
          const responseData = JSON.parse(res.body);
          // Handle both response formats: direct accessToken or nested in tokens
          const token = responseData.accessToken || (responseData.tokens && responseData.tokens.accessToken);
          
          // Add the token to the cache if successful
          if (token && tokenCache.length < maxCachedTokens) {
            tokenCache.push(token);
          }
          
          return token;
        } catch (e) {
          console.error(`Failed to parse authentication response: ${res.body}`);
        }
      } else {
        console.error(`Authentication failed with status ${res.status}: ${res.body}`);
      }
    } catch (e) {
      console.error(`Exception during authentication attempt ${attempts}: ${e.message}`);
    }
    
    // If we're not at max attempts, wait with exponential backoff before trying again
    if (attempts < maxAttempts) {
      const backoffTime = Math.pow(2, attempts - 1) * 0.5; // 0.5s, 1s, 2s
      console.log(`Retrying authentication in ${backoffTime}s (attempt ${attempts}/${maxAttempts})`);
      sleep(backoffTime);
    }
  }
  
  return null; // Return null if all attempts failed
}

// Override the utility functions to use auth token and bypass cache
function extendUtilsWithAuth(token) {
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Bypass-Cache': 'true' // Custom header to bypass cache
  };
  
  // Override getMenus to use auth and bypass cache
  const originalGetMenus = getMenus;
  global.getMenus = function(params = {}) {
    const url = `${config.baseUrl}${config.apiPrefix}/api/menus?nocache=true`; // Query param to bypass cache
    const requestParams = { 
      headers: authHeaders,
      timeout: '10s',
      ...params 
    };
    const res = http.get(url, requestParams);
    
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
  };
  
  // Override getMenuById to use auth and bypass cache
  const originalGetMenuById = getMenuById;
  global.getMenuById = function(menuId) {
    const url = `${config.baseUrl}${config.apiPrefix}/api/menus/${menuId}?nocache=true`;
    const res = http.get(url, { headers: authHeaders });
    
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
  };
  
  // Similarly override other functions to use auth token and bypass cache
  // This pattern can be repeated for all other utility functions
}

// Run setup to pre-create data for the test
export function setup() {
  console.log('Creating initial data for realistic workload testing with authentication...');
  
  // Authenticate to get multiple tokens for the token cache
  for (let i = 0; i < 10; i++) {
    const token = authenticate();
    if (token) {
      console.log('Successfully authenticated for test setup and cached token');
    }
  }
  
  // Get a token for setup operations
  const token = authenticate();
  if (!token) {
    console.error('Failed to authenticate for test setup. Using default load test endpoints.');
  } else {
    console.log('Successfully authenticated for test setup');
    // Extend utils with auth token
    extendUtilsWithAuth(token);
  }
  
  // Create menus for the test - restore original menu count
  const menus = [];
  const completeMenuCount = 20; // Change back to 20 complete menus as per original setting
  
  console.log(`Creating ${completeMenuCount} complete menus with categories and items...`);
  for (let i = 0; i < completeMenuCount; i++) {
    try {
      const result = createCompleteMenu();
      if (result && result.menu) {
        menus.push(result.menu);
      }
      // Add a larger delay to avoid overwhelming the service during setup
      sleep(1);
    } catch (e) {
      console.error(`Error creating menu ${i+1}/${completeMenuCount}: ${e.message}`);
    }
  }
  
  console.log(`Created ${menus.length} menus for realistic workload testing`);
  console.log(`Token cache size: ${tokenCache.length}`);
  return { 
    menus: menus,
    createdEntities: {
      menuIds: menus.map(menu => menu.id),
      categoryIds: [],
      menuItemIds: []
    }
  };
}

// Default function that will be executed for each VU
export default function(data) {
  // Authenticate to get a JWT token for this virtual user
  const token = authenticate();
  let isAuthenticated = !!token;
  
  try {
    // Extend the utility functions with authentication and cache bypassing if token available
    if (isAuthenticated) {
      extendUtilsWithAuth(token);
    }
    
    // Set global timeout for all requests
    const requestParams = {
      timeout: '10s'
    };
    
    // Try health check up to 3 times but continue with test regardless
    let healthCheckPassed = false;
    let attempts = 0;
    while (!healthCheckPassed && attempts < 3) {
      attempts++;
      healthCheckPassed = healthCheck(requestParams);
      if (!healthCheckPassed && attempts < 3) {
        console.log(`Retrying health check (attempt ${attempts}/3)...`);
        sleep(1);
      }
    }
    
    if (!healthCheckPassed) {
      console.log(`Health check failed after ${attempts} attempts, continuing with test anyway...`);
    }
    
    // Use a weighted distribution to simulate real-world usage patterns
    const rand = Math.random() * 100;
    
    try {
      // Even if auth failed, continue with the test using non-authenticated endpoints
      // 70% of traffic is read operations
      if (rand < 70) {
        performReadOperation(data);
      }
      // 15% is create operations
      else if (rand < 85) {
        performCreateOperation(data);
      }
      // 10% is update operations
      else if (rand < 95) {
        performUpdateOperation(data);
      }
      // 5% is delete operations
      else {
        performDeleteOperation(data);
      }
    } catch (e) {
      console.error(`Error executing operation: ${e.message}`);
    }
  } catch (e) {
    console.error(`Error in default function: ${e.message}`);
  } finally {
    // Variable sleep to simulate realistic user behavior
    const sleepTime = Math.random() * 3;  // Sleep between 0-3 seconds
    sleep(sleepTime);
  }
}

// Helper function to track created entities
function trackEntity(data, type, id) {
  if (type === 'category') {
    data.createdEntities.categoryIds.push(id);
  } else if (type === 'menuItem') {
    data.createdEntities.menuItemIds.push(id);
  } else if (type === 'menu') {
    data.createdEntities.menuIds.push(id);
  }
}

// Perform a read operation (GET)
function performReadOperation(data) {
  // Randomly choose what type of read operation to perform
  const readType = Math.floor(Math.random() * 4);
  
  switch(readType) {
    case 0:
      // Get all menus - most common operation
      getMenus();
      break;
    case 1:
      // Get a specific menu
      const menus = getMenus();
      if (menus && menus.length > 0) {
        getMenuById(menus[0].id);
      } else {
        getMenus();
      }
      break;
    case 2:
      // Get a specific category
      const menusForCategory = getMenus();
      if (menusForCategory && menusForCategory.length > 0) {
        const category = createCategory(menusForCategory[0].id);
        if (category && category.id) {
          getCategoryById(category.id);
          trackEntity(data, 'category', category.id);
        } else {
          getMenus();
        }
      } else {
        getMenus();
      }
      break;
    case 3:
      // Get a specific menu item
      const menusForItem = getMenus();
      if (menusForItem && menusForItem.length > 0) {
        const category = createCategory(menusForItem[0].id);
        if (category && category.id) {
          const menuItem = createMenuItem(category.id);
          if (menuItem && menuItem.id) {
            getMenuItemById(menuItem.id);
            trackEntity(data, 'menuItem', menuItem.id);
          } else {
            getMenus();
          }
        } else {
          getMenus();
        }
      } else {
        getMenus();
      }
      break;
  }
}

// Perform a create operation (POST)
function performCreateOperation(data) {
  // Randomly choose what type of create operation to perform
  const createType = Math.floor(Math.random() * 3);
  
  switch(createType) {
    case 0:
      // Create a new menu
      const menu = createMenu();
      if (menu && menu.id) {
        trackEntity(data, 'menu', menu.id);
      }
      break;
    case 1:
      // Create a new category
      const menus = getMenus();
      let menuId;
      
      if (menus && menus.length > 0) {
        menuId = menus[0].id;
      } else {
        const newMenu = createMenu();
        if (newMenu && newMenu.id) {
          menuId = newMenu.id;
          trackEntity(data, 'menu', newMenu.id);
        }
      }
      
      const category = createCategory(menuId);
      if (category && category.id) {
        trackEntity(data, 'category', category.id);
      }
      break;
    case 2:
      // Create a new menu item
      const menusForItem = getMenus();
      let categoryId;
      
      if (menusForItem && menusForItem.length > 0) {
        const cat = createCategory(menusForItem[0].id);
        if (cat && cat.id) {
          categoryId = cat.id;
          trackEntity(data, 'category', cat.id);
        }
      }
      
      const menuItem = createMenuItem(categoryId);
      if (menuItem && menuItem.id) {
        trackEntity(data, 'menuItem', menuItem.id);
      }
      break;
  }
}

// Perform an update operation (PATCH)
function performUpdateOperation(data) {
  // Randomly choose what type of update operation to perform
  const updateType = Math.floor(Math.random() * 3);
  
  switch(updateType) {
    case 0:
      // Update a menu
      const menus = getMenus();
      if (menus && menus.length > 0) {
        updateMenu(menus[0].id);
      }
      break;
    case 1:
      // Update a category
      const menusForCategory = getMenus();
      if (menusForCategory && menusForCategory.length > 0) {
        const category = createCategory(menusForCategory[0].id);
        if (category && category.id) {
          updateCategory(category.id);
          trackEntity(data, 'category', category.id);
        }
      }
      break;
    case 2:
      // Update a menu item
      const menusForItem = getMenus();
      if (menusForItem && menusForItem.length > 0) {
        const category = createCategory(menusForItem[0].id);
        if (category && category.id) {
          const menuItem = createMenuItem(category.id);
          if (menuItem && menuItem.id) {
            updateMenuItem(menuItem.id);
            trackEntity(data, 'menuItem', menuItem.id);
          }
        }
      }
      break;
  }
}

// Perform a delete operation (DELETE)
function performDeleteOperation(data) {
  // Randomly choose what type of delete operation to perform
  const deleteType = Math.floor(Math.random() * 3);
  
  switch(deleteType) {
    case 0:
      // Delete a menu
      const menu = createMenu();
      if (menu && menu.id) {
        deleteMenu(menu.id);
      }
      break;
    case 1:
      // Delete a category
      const menusForCategory = getMenus();
      if (menusForCategory && menusForCategory.length > 0) {
        const category = createCategory(menusForCategory[0].id);
        if (category && category.id) {
          deleteCategory(category.id);
        }
      }
      break;
    case 2:
      // Delete a menu item
      const menusForItem = getMenus();
      if (menusForItem && menusForItem.length > 0) {
        const category = createCategory(menusForItem[0].id);
        if (category && category.id) {
          const menuItem = createMenuItem(category.id);
          if (menuItem && menuItem.id) {
            deleteMenuItem(menuItem.id);
          }
        }
      }
      break;
  }
}

// Helper function to get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Cleanup function for after the test
export function teardown(data) {
  console.log('Test complete. Cleanup is handled by the menu service automatically.');
}
 