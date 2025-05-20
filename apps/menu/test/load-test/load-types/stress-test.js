import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu,
  successRate
} from './utils.js';

// Define the load test configuration with gradually increasing load
export const options = {
  // Testing with increasing load to find breaking points
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up to 100 VUs in 1 minute
    { duration: '2m', target: 500 },  // Ramp-up to 500 VUs in 2 minutes
    { duration: '1m', target: 500 },  // Stay at 500 VUs for 1 minute
    { duration: '1m', target: 1000 }, // Ramp-up to 1000 VUs in 1 minute
    { duration: '2m', target: 1000 }, // Stay at 1000 VUs for 2 minutes
    { duration: '1m', target: 0 },    // Ramp-down to 0 VUs
  ],
  
  // Updated thresholds for stress testing
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<5000', 'p(99)<8000'], // More lenient for stress testing
    
    // Success rate
    'menu_create_success_rate': ['rate>0.90'],       // 90% success rate for creation
    'menu_get_success_rate': ['rate>0.95'],          // 95% success rate for reads
    'menu_update_success_rate': ['rate>0.90'],       // 90% success rate for updates
    'menu_delete_success_rate': ['rate>0.90'],       // 90% success rate for deletions
    
    'category_create_success_rate': ['rate>0.90'],
    'category_get_success_rate': ['rate>0.95'],
    'category_update_success_rate': ['rate>0.90'],
    'category_delete_success_rate': ['rate>0.90'],
    
    'menu_item_create_success_rate': ['rate>0.90'],
    'menu_item_get_success_rate': ['rate>0.95'],
    'menu_item_update_success_rate': ['rate>0.90'],
    'menu_item_delete_success_rate': ['rate>0.90'],
    
    // Overall API performance during stress test
    'overall_success_rate': ['rate>0.90'],           // 90% of all requests should succeed
  },
  // Output detailed statistics
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Run setup to pre-create some data
export function setup() {
  console.log('Creating initial data for stress testing...');
  
  // Create menus for the test
  const menus = [];
  for (let i = 0; i < 10; i++) {
    const result = createCompleteMenu();
    if (result && result.menu) {
      menus.push(result.menu);
    }
    // Add a small delay to avoid overwhelming the service during setup
    sleep(0.5);
  }
  
  console.log(`Created ${menus.length} menus for stress testing`);
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
  
  // 70% of traffic is reading menus (high volume read operation)
  if (rand < 70) {
    getMenus();
  }
  // 15% is creating new menus
  else if (rand < 85) {
    createMenu();
  }
  // 10% is creating categories
  else if (rand < 95) {
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
  // 5% is creating menu items (least common)
  else {
    createMenuItem();
  }
  
  // Very short pause to maximize throughput for stress testing - matching auth service
  sleep(0.1);
}

// Teardown function to log completion
export function teardown(data) {
  console.log('Stress test completed');
} 