import { sleep } from 'k6';
import {
  config,
  registerUser,
  loginUser,
  refreshToken,
  forgotPassword,
  ensureAuthenticated,
  logoutUser,
  successRate
} from './utils.js';

export const options = {
  // Use stages to gradually increase the number of VUs
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '30s', target: 200 }, // Ramp up to 200 users
    { duration: '30s', target: 500 }, // Ramp up to 500 users
    { duration: '30s', target: 500 }  // Stay at 500 users
  ],
  thresholds: {
    ...config.thresholds,
    // Slightly more lenient thresholds for the stress test
    'http_req_duration': ['p(95)<1500'], // 95% of requests should be under 1.5s
    'login_response_time': ['p(95)<1200'], // 95% of logins should be under 1.2s
    'success_rate': ['rate>0.90'], // Success rate should be above 90%
  },
  // Output results to stdout and JSON file
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Run setup to pre-create some users
export function setup() {
  console.log('Creating initial user pool for stress testing...');
  
  // Create 50 users for the test
  const users = [];
  for (let i = 0; i < 50; i++) {
    const user = registerUser();
    if (user) {
      users.push(user);
      // Avoid rate limiting during setup
      sleep(0.2);
    }
  }
  
  return { users };
}

export default function(data) {
  // Weighted distribution focused on high-volume operations
  const rand = Math.random() * 100;
  
  // 70% of traffic is logins - this is typically the most common operation
  if (rand < 70) {
    if (data.users && data.users.length > 0) {
      // Use a pre-created user 90% of the time to reduce registration load
      if (Math.random() < 0.9) {
        const randomIndex = Math.floor(Math.random() * data.users.length);
        const randomUser = data.users[randomIndex];
        loginUser(randomUser.email, randomUser.password);
      } else {
        // Create a new user 10% of the time
        const newUser = registerUser();
        if (newUser) {
          loginUser(newUser.email, newUser.password);
        }
      }
    } else {
      // Fallback if no users were created in setup
      const newUser = registerUser();
      if (newUser) {
        loginUser(newUser.email, newUser.password);
      }
    }
  }
  // 20% is token refresh - second most common operation
  else if (rand < 90) {
    const authData = ensureAuthenticated();
    if (authData && authData.tokens) {
      refreshToken(authData.tokens.refreshToken);
    }
  }
  // 7% is full login/logout workflow
  else if (rand < 97) {
    const userData = ensureAuthenticated();
    if (userData && userData.tokens) {
      logoutUser(userData.tokens.accessToken, userData.tokens.refreshToken);
    }
  }
  // 2% is password reset - uncommon operation
  else if (rand < 99) {
    if (data.users && data.users.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.users.length);
      const randomUser = data.users[randomIndex];
      forgotPassword(randomUser.email);
    } else {
      const testUser = registerUser();
      if (testUser) {
        forgotPassword(testUser.email);
      }
    }
  }
  // 1% is new user registration - least common for established service
  else {
    registerUser();
  }
  
  // Very short pause to maximize throughput for stress testing
  sleep(0.1);
}

// Teardown function to log completion
export function teardown(data) {
  console.log('Stress test completed');
  } 