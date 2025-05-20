import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu
} from './utils.js';

// Define the spike test configuration (sudden increase in traffic)
export const options = {
  // Test with rapid spike in load
  stages: [
    { duration: '1m', target: 50 },    // Ramp-up to moderate load
    { duration: '1m', target: 50 },    // Stay at moderate load
    { duration: '30s', target: 1500 }, // Sudden spike to very high load
    { duration: '1m', target: 1500 },  // Stay at spike
    { duration: '2m', target: 50 },    // Scale down to normal load
    { duration: '1m', target: 0 },     // Ramp-down to 0
  ],
  
  // Updated thresholds for spike testing
  thresholds: {
    // Response time thresholds for spike test are more lenient
    'http_req_duration': ['p(95)<6000', 'p(99)<10000'],
    
    // Success rates must remain reasonably high even during spikes
    'menu_create_success_rate': ['rate>0.85'],
    'menu_get_success_rate': ['rate>0.90'],
    'menu_update_success_rate': ['rate>0.85'],
    'menu_delete_success_rate': ['rate>0.85'],
    
    'category_create_success_rate': ['rate>0.85'],
    'category_get_success_rate': ['rate>0.90'],
    'category_update_success_rate': ['rate>0.85'],
    'category_delete_success_rate': ['rate>0.85'],
    
    'menu_item_create_success_rate': ['rate>0.85'],
    'menu_item_get_success_rate': ['rate>0.90'],
    'menu_item_update_success_rate': ['rate>0.85'],
    'menu_item_delete_success_rate': ['rate>0.85'],
    
    // Overall performance
    'overall_success_rate': ['rate>0.85'],
  },
};

// Run setup to pre-create some data
export function setup() {
  console.log('Creating initial data for spike testing...');
  
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
  
  console.log(`Created ${menus.length} menus for spike testing`);
  return { menus };
}

// Default function that will be executed for each VU
export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Menu service health check failed during spike test. Skipping this iteration.');
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
  
  // Variable pause to simulate varying user behavior during spikes
  sleep(Math.random() * 0.5);
}

// Teardown function to log completion
export function teardown() {
  console.log('Spike test completed');
} 