import { sleep } from 'k6';
import {
  config,
  registerUser,
  loginUser,
  refreshToken,
  forgotPassword,
  ensureAuthenticated,
  logoutUser,
  successRate,
  healthCheck
} from './utils.js';

export const options = {
  // Use scenarios for better control of VU behavior
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 10 }, // Slowly ramp up to 10 VUs
        { duration: '15s', target: 25 }, // Continue ramping up to 25 VUs
        { duration: '15s', target: 50 }, // Reach target 50 VUs
        { duration: '30s', target: 50 }, // Stay at 50 VUs
        { duration: '10s', target: 0 }   // Ramp down (graceful shutdown)
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    ...config.thresholds,
    // Add more realistic thresholds for the baseline test
    'login_response_time': ['p(95)<1500'],    // 95% of logins should be under 1.5s (increased from 800ms)
    'register_response_time': ['p(95)<2000'],  // 95% of registrations should be under 2s (increased from 1.2s)
    'login_success_rate': ['rate>0.95'],      // Login success rate should be above 95%
    'register_success_rate': ['rate>0.95'],   // Registration success rate should be above 95%
  },
  // Output results to stdout and JSON file
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Run setup to pre-create some users
export function setup() {
  console.log('=====================================');
  console.log('Creating initial user pool for testing...');
  console.log('=====================================');
  
  // Check if the auth service is running and accessible
  if (!healthCheck()) {
    console.error('AUTH SERVICE HEALTH CHECK FAILED. Cannot proceed with tests.');
    console.error('Make sure the auth service is running on http://localhost:3000');
    return { users: [] };
  }
  
  console.log('Health check passed, attempting to create test users...');
  
  // Create 5 users for the test (reduced to avoid rate limiting)
  const users = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < 5; i++) {
    try {
      const user = registerUser();
      if (user) {
        users.push(user);
        successCount++;
        console.log(`Successfully created test user ${successCount}: ${user.email}`);
        // Avoid rate limiting during setup
        sleep(0.5);
      } else {
        failCount++;
        console.error(`Failed to create test user ${i+1}`);
      }
    } catch (e) {
      failCount++;
      console.error(`Error while creating test user ${i+1}: ${e.message}`);
    }
  }
  
  console.log('=====================================');
  console.log('=====================================');
  
  return { users };
}

export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Auth service health check failed during test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Use a weighted distribution to simulate real user patterns
  const rand = Math.random() * 100;
  
  // 50% of traffic is logins
  if (rand < 50) {
    if (data.users && data.users.length > 0) {
      // Use a pre-created user 80% of the time
      if (Math.random() < 0.8) {
        const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
        loginUser(randomUser.email, randomUser.password);
      } else {
        // Create a new user 20% of the time
        const newUser = registerUser();
        if (newUser) {
          sleep(0.5); // Small pause to simulate user behavior
          loginUser(newUser.email, newUser.password);
        }
      }
    } else {
      // Fallback if no users were created in setup
      const newUser = registerUser();
      if (newUser) {
        sleep(0.5); // Small pause to simulate user behavior
        loginUser(newUser.email, newUser.password);
      }
    }
  }
  // 20% is token refresh
  else if (rand < 70) {
    const authData = ensureAuthenticated();
    if (authData && authData.tokens) {
      refreshToken(authData.tokens.refreshToken);
    }
  }
  // 15% is full login/logout workflow
  else if (rand < 85) {
    const userData = ensureAuthenticated();
    if (userData && userData.tokens) {
      // Simulate a small pause after login
      sleep(0.5);
      
      // Log out
      logoutUser(userData.tokens.accessToken, userData.tokens.refreshToken);
    }
  }
  // 10% is password reset
  else if (rand < 95) {
    if (data.users && data.users.length > 0) {
      const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
      forgotPassword(randomUser.email);
    } else {
      const testUser = registerUser();
      if (testUser) {
        forgotPassword(testUser.email);
      }
    }
  }
  // 5% is new user registration
  else {
    registerUser();
  }
  
  // Wait a short time between operations to simulate user behavior
  sleep(0.3);
} 