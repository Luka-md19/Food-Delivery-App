import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu
} from './utils.js';

// Define the endurance test configuration (sustained moderate load over longer period)
export const options = {
  // Test with extended duration under moderate load
  stages: [
    { duration: '1m', target: 200 },   // Ramp-up to target load
    { duration: '15m', target: 200 },  // Stay at target load for 15 minutes
    { duration: '1m', target: 0 },     // Ramp-down to 0
  ],
  
  // Updated thresholds for endurance testing
  thresholds: {
    // For endurance tests, we want consistently good performance over time
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    
    // Success rates should be high for extended periods
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
    
    // Overall performance over extended time
    'overall_success_rate': ['rate>0.95'],
  },
};

// Run setup to pre-create some data
export function setup() {
  console.log('Creating initial data for endurance testing...');
  
  // Create more menus for the endurance test
  const menus = [];
  for (let i = 0; i < 10; i++) {
    const result = createCompleteMenu();
    if (result && result.menu) {
      menus.push(result.menu);
    }
    // Add a small delay to avoid overwhelming the service during setup
    sleep(0.5);
  }
  
  console.log(`Created ${menus.length} menus for endurance testing`);
  return { menus };
}

// Default function that will be executed for each VU
export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Menu service health check failed during endurance test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Use a weighted distribution to simulate real user patterns
  const rand = Math.random() * 100;
  
  // 60% of traffic is reading menus (higher ratio of reads for endurance test)
  if (rand < 60) {
    getMenus();
  }
  // 15% is creating new menus
  else if (rand < 75) {
    createMenu();
  }
  // 15% is creating categories
  else if (rand < 90) {
    if (data.menus && data.menus.length > 0) {
      // Use a pre-created menu 90% of the time
      if (Math.random() < 0.9) {
        const randomMenu = data.menus[Math.floor(Math.random() * data.menus.length)];
        createCategory(randomMenu.id);
      } else {
        // Create a new menu + category
        createCategory();
      }
    } else {
      // If no menus were created in setup
      createCategory();
    }
  }
  // 10% is creating menu items
  else {
    createMenuItem();
  }
  
  // Longer pause for endurance test to simulate realistic user behavior
  sleep(Math.random() * 1 + 0.5); // 0.5 to 1.5 seconds
}

// Teardown function to log completion
export function teardown() {
  console.log('Endurance test completed');
} 