import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu
} from './utils.js';

// Define the load test configuration
export const options = {
  // Low-volume test for establishing baseline performance
  stages: [
    { duration: '1m', target: 25 },  // Ramp-up to low load
    { duration: '2m', target: 25 },  // Stay at low load
    { duration: '1m', target: 0 },   // Ramp-down to 0
  ],
  
  // Updated thresholds for baseline testing
  thresholds: {
    // For baseline tests, we expect better performance at low load
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'],
    
    // Success rates should be very high at low load
    'menu_create_success_rate': ['rate>0.98'],
    'menu_get_success_rate': ['rate>0.99'],
    'menu_update_success_rate': ['rate>0.98'],
    'menu_delete_success_rate': ['rate>0.98'],
    
    'category_create_success_rate': ['rate>0.98'],
    'category_get_success_rate': ['rate>0.99'],
    'category_update_success_rate': ['rate>0.98'],
    'category_delete_success_rate': ['rate>0.98'],
    
    'menu_item_create_success_rate': ['rate>0.98'],
    'menu_item_get_success_rate': ['rate>0.99'],
    'menu_item_update_success_rate': ['rate>0.98'],
    'menu_item_delete_success_rate': ['rate>0.98'],
    
    // Overall performance baseline
    'overall_success_rate': ['rate>0.98'],
  },
};

// Run setup to pre-create some data
export function setup() {
  console.log('Creating initial data for baseline testing...');
  
  // Create a few complete menus to work with
  const menus = [];
  for (let i = 0; i < 5; i++) {
    const result = createCompleteMenu();
    if (result && result.menu) {
      menus.push(result.menu);
    }
    // Add a small delay to avoid overwhelming the service during setup
    sleep(0.5);
  }
  
  console.log(`Created ${menus.length} menus for baseline testing`);
  return { menus };
}

// Default function that will be executed for each VU
export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Menu service health check failed during test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Use a weighted distribution to simulate real user patterns
  const rand = Math.random() * 100;
  
  // 40% of traffic is reading menus
  if (rand < 40) {
    getMenus();
  }
  // 25% is creating new menus
  else if (rand < 65) {
    createMenu();
  }
  // 20% is creating categories
  else if (rand < 85) {
    if (data.menus && data.menus.length > 0) {
      // Use a pre-created menu 80% of the time
      if (Math.random() < 0.8) {
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
  // 15% is creating menu items
  else {
    createMenuItem();
  }
  
  // Small pause to simulate user behavior
  sleep(0.3);
} 