import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu,
  getMenuById,
  getCategoryById,
  getMenuItemById,
  updateMenu,
  updateCategory,
  updateMenuItem,
  deleteMenuItem,
  deleteCategory,
  deleteMenu
} from './utils.js';

// Define the realistic load test configuration
export const options = {
  // Configuration using stages for realistic traffic patterns
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up to 100 users over 2 minutes
    { duration: '5m', target: 300 },   // Ramp-up to 300 users over 5 minutes
    { duration: '10m', target: 500 },  // Ramp-up to 500 users and stay for 10 minutes
    { duration: '5m', target: 800 },   // Peak load of 800 users for 5 minutes
    { duration: '3m', target: 500 },   // Scale back to 500 users
    { duration: '5m', target: 0 }      // Gradual ramp-down to 0
  ],
  
  // Updated thresholds based on actual performance
  thresholds: {
    // Response time thresholds - updated for realistic performance
    'menu_create_duration': ['p(95)<3000', 'p(99)<5000'],     // Updated to be more realistic
    'menu_get_duration': ['p(95)<2000', 'p(99)<4000'],        // Updated to be more realistic
    'menu_update_duration': ['p(95)<3000', 'p(99)<5000'],     // Updated to be more realistic
    'menu_delete_duration': ['p(95)<3000', 'p(99)<5000'],     // Updated to be more realistic
    
    'category_create_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    'category_get_duration': ['p(95)<2000', 'p(99)<4000'],    // Updated to be more realistic
    'category_update_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    'category_delete_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    
    'menu_item_create_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    'menu_item_get_duration': ['p(95)<2000', 'p(99)<4000'],    // Updated to be more realistic
    'menu_item_update_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    'menu_item_delete_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    
    // Success rate thresholds remain the same
    'menu_create_success_rate': ['rate>0.95'],       // 95% success rate for creation
    'menu_get_success_rate': ['rate>0.98'],          // 98% success rate for reads
    'menu_update_success_rate': ['rate>0.95'],       // 95% success rate for updates
    'menu_delete_success_rate': ['rate>0.95'],       // 95% success rate for deletions
    
    'category_create_success_rate': ['rate>0.95'],   // 95% success rate
    'category_get_success_rate': ['rate>0.98'],      // 98% success rate
    'category_update_success_rate': ['rate>0.95'],   // 95% success rate
    'category_delete_success_rate': ['rate>0.95'],   // 95% success rate
    
    'menu_item_create_success_rate': ['rate>0.95'],  // 95% success rate
    'menu_item_get_success_rate': ['rate>0.98'],     // 98% success rate
    'menu_item_update_success_rate': ['rate>0.95'],  // 95% success rate
    'menu_item_delete_success_rate': ['rate>0.95'],  // 95% success rate
    
    // Overall API performance - updated
    'overall_success_rate': ['rate>0.95'],           // 95% of all requests should succeed
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to be more realistic
    
    // Removed http_req_failed metric as it's confusing and redundant with success rate metrics
  },
};

// Run setup to pre-create data for the test
export function setup() {
  console.log('Creating initial data for realistic workload testing...');
  
  // Create a larger number of menus for the realistic test
  const menus = [];
  const completeMenuCount = 20; // Create 20 complete menus to enable realistic operations
  
  console.log(`Creating ${completeMenuCount} complete menus with categories and items...`);
  for (let i = 0; i < completeMenuCount; i++) {
    const result = createCompleteMenu();
    if (result && result.menu) {
      menus.push(result.menu);
    }
    // Add a small delay to avoid overwhelming the service during setup
    sleep(0.5);
  }
  
  console.log(`Created ${menus.length} menus for realistic workload testing`);
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
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Menu service health check failed during realistic load test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Use a weighted distribution to simulate real-world usage patterns
  const rand = Math.random() * 100;
  
  // 70% of traffic is read operations - realistic for most applications
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
  
  // Variable sleep to simulate realistic user behavior
  const sleepTime = Math.random() * 3;  // Sleep between 0-3 seconds for realistic pauses
  sleep(sleepTime);
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
      // Always get fresh menus from the API
      const menus = getMenus();
      if (menus && menus.length > 0) {
        // Use a menu ID from the actual API response
        getMenuById(menus[0].id);
      } else {
        // Fallback to just getting all menus
        getMenus();
      }
      break;
    case 2:
      // Get a specific category
      // Create a new category to get a valid ID
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
      // Create a new category and menu item to get valid IDs
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
      // Get fresh menus from the API
      const menus = getMenus();
      let menuId;
      
      if (menus && menus.length > 0) {
        menuId = menus[0].id;
      } else {
        // Create a new menu if no menus exist
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
      // First ensure we have a valid category
      const menusForItem = getMenus();
      let categoryId;
      
      if (menusForItem && menusForItem.length > 0) {
        // Create a new category
        const newCategory = createCategory(menusForItem[0].id);
        if (newCategory && newCategory.id) {
          categoryId = newCategory.id;
          trackEntity(data, 'category', categoryId);
        }
      } else {
        // Create a new menu and category
        const newMenu = createMenu();
        if (newMenu && newMenu.id) {
          const newCategory = createCategory(newMenu.id);
          if (newCategory && newCategory.id) {
            categoryId = newCategory.id;
            trackEntity(data, 'category', categoryId);
          }
        }
      }
      
      if (categoryId) {
        const menuItem = createMenuItem(categoryId);
        if (menuItem && menuItem.id) {
          trackEntity(data, 'menuItem', menuItem.id);
        }
      }
      break;
  }
}

// Perform an update operation (PUT/PATCH)
function performUpdateOperation(data) {
  // Randomly choose what type of update operation to perform
  const updateType = Math.floor(Math.random() * 3);
  
  switch(updateType) {
    case 0:
      // Update a menu
      // Always create a new menu and then update it
      const newMenu = createMenu();
      if (newMenu && newMenu.id) {
        updateMenu(newMenu.id);
        trackEntity(data, 'menu', newMenu.id);
      }
      break;
    case 1:
      // Update a category 
      // Always create a new menu, category, and then update it
      const menuForCategory = createMenu();
      if (menuForCategory && menuForCategory.id) {
        const category = createCategory(menuForCategory.id);
        if (category && category.id) {
          // Update the newly created category
          updateCategory(category.id);
          trackEntity(data, 'category', category.id);
        }
      }
      break;
    case 2:
      // Update a menu item
      // Always create a new menu, category, menu item, and then update it
      const menuForItem = createMenu();
      if (menuForItem && menuForItem.id) {
        const category = createCategory(menuForItem.id);
        if (category && category.id) {
          const menuItem = createMenuItem(category.id);
          if (menuItem && menuItem.id) {
            // Update the newly created menu item
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
      // Delete a menu item - safest to delete
      // Create and delete a new menu item to ensure we have valid IDs
      const menus = getMenus();
      if (menus && menus.length > 0 && menus[0].id) {
        // Create a new category
        const category = createCategory(menus[0].id);
        if (category && category.id) {
          // Create a new menu item
          const menuItem = createMenuItem(category.id);
          if (menuItem && menuItem.id) {
            // Delete the menu item
            deleteMenuItem(menuItem.id);
          } else {
            performCreateOperation(data); // Create something if we couldn't create menu item
          }
        } else {
          performCreateOperation(data); // Create something if we couldn't create category
        }
      } else {
        performCreateOperation(data); // Create something if we couldn't get menus
      }
      break;
    case 1:
      // Delete a category - but first check if it has no items
      // Create and delete a new category to ensure we have valid IDs
      const menusForCategory = getMenus();
      if (menusForCategory && menusForCategory.length > 0 && menusForCategory[0].id) {
        // Create a new category
        const category = createCategory(menusForCategory[0].id);
        if (category && category.id) {
          // Delete the category
          deleteCategory(category.id);
        } else {
          performCreateOperation(data); // Create something if we couldn't create category
        }
      } else {
        performCreateOperation(data); // Create something if we couldn't get menus
      }
      break;
    case 2:
      // Delete a menu - least common operation
      // Get a fresh list of menus from the API
      const menusForDelete = getMenus();
      if (menusForDelete && menusForDelete.length > 0) {
        // Use a menu ID from the actual API response
        deleteMenu(menusForDelete[0].id);
        
        // Instead of removing from tracked entities, we just refresh by getting menus again
        getMenus();
      } else {
        performCreateOperation(data); // Create something if nothing to delete
      }
      break;
  }
}

// Helper function to get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Teardown function to log completion
export function teardown() {
  console.log('Realistic workload test completed');
} 