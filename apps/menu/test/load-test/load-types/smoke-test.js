import { sleep } from 'k6';
import { 
  healthCheck, 
  createMenu, 
  createCategory, 
  createMenuItem, 
  getMenus,
  createCompleteMenu
} from './utils.js';

// Define the smoke test configuration (very light load)
export const options = {
  // Minimal test to verify the system works
  vus: 5,                 // Just 5 virtual users
  duration: '1m',         // Run for 1 minute
  
  // Updated thresholds for smoke testing
  thresholds: {
    // For smoke tests, we have stricter performance expectations
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    
    // Success rates must be nearly perfect for a smoke test
    'menu_create_success_rate': ['rate>0.99'],
    'menu_get_success_rate': ['rate>0.99'],
    'menu_update_success_rate': ['rate>0.99'],
    'menu_delete_success_rate': ['rate>0.99'],
    
    'category_create_success_rate': ['rate>0.99'],
    'category_get_success_rate': ['rate>0.99'],
    'category_update_success_rate': ['rate>0.99'],
    'category_delete_success_rate': ['rate>0.99'],
    
    'menu_item_create_success_rate': ['rate>0.99'],
    'menu_item_get_success_rate': ['rate>0.99'],
    'menu_item_update_success_rate': ['rate>0.99'],
    'menu_item_delete_success_rate': ['rate>0.99'],
    
    // Overall smoke test performance
    'overall_success_rate': ['rate>0.99'],
  },
};

// Run setup to pre-create some data
export function setup() {
  console.log('Creating initial data for smoke testing...');
  
  // Create just a single complete menu
  const menu = createCompleteMenu();
  
  console.log('Created test menu for smoke testing');
  return { menu };
}

// Default function that will be executed for each VU
export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Menu service health check failed during smoke test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Simple smoke test pattern - alternate between reading and creating
  if (Math.random() < 0.5) {
    getMenus();
  } else {
    createMenu();
  }
  
  // Small pause to simulate user behavior
  sleep(0.5);
} 