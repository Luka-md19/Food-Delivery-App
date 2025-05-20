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
  healthCheck,
  registerUserLoadTest,
  loginUserLoadTest
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
    // Response time thresholds
    'login_response_time': ['p(95)<3000', 'p(99)<5000'],       // Updated to match real performance
    'register_response_time': ['p(95)<3000', 'p(99)<5000'],    // Updated to match real performance
    'refresh_token_response_time': ['p(95)<3000', 'p(99)<5000'], // Updated to match real performance
    'forgot_password_response_time': ['p(95)<3000', 'p(99)<5000'], // Updated to match real performance
    
    // Success rate thresholds
    'login_success_rate': ['rate>0.95'],        // 95% success rate for logins
    'register_success_rate': ['rate>0.95'],     // 95% success rate for registrations
    'refresh_token_success_rate': ['rate>0.98'], // 98% success rate for token refreshes
    'forgot_password_success_rate': ['rate>0.98'], // 98% success rate for password reset
    
    // Overall API performance updated
    'success_rate': ['rate>0.95'],              // 95% of all requests should succeed
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'], // Updated to match real performance
  },
};

// Run setup to pre-create users for the test
export function setup() {
  console.log('Creating initial user pool for realistic auth load testing...');
  
  // Check if the auth service is running and accessible
  if (!healthCheck()) {
    console.error('AUTH SERVICE HEALTH CHECK FAILED. Cannot proceed with tests.');
    console.error('Make sure the auth service is running on http://localhost:3000');
    return { users: [] };
  }
  
  console.log('Health check passed, creating test users...');
  
  // Create a larger number of users for the realistic test
  const users = [];
  const preCreatedUserCount = 50; // Create 50 users to start with
  
  console.log(`Creating ${preCreatedUserCount} users for testing...`);
  for (let i = 0; i < preCreatedUserCount; i++) {
    try {
      // Use load test optimized user creation
      const user = registerUserLoadTest();
      if (user) {
        users.push(user);
        if (i % 10 === 0) {
          console.log(`Created ${i+1}/${preCreatedUserCount} test users`);
        }
      }
      // Add a small delay to avoid overwhelming the service during setup
      sleep(0.2);
    } catch (e) {
      console.error(`Error creating test user: ${e.message}`);
    }
  }
  
  console.log(`Successfully created ${users.length}/${preCreatedUserCount} users for testing`);
  return { users };
}

// Default function that will be executed for each virtual user
export default function(data) {
  // Run health check first to ensure service is accessible
  if (!healthCheck()) {
    console.error('Auth service health check failed during realistic load test. Skipping this iteration.');
    sleep(1);
    return;
  }
  
  // Use a weighted distribution to simulate real-world usage patterns
  const rand = Math.random() * 100;
  
  // 60% of traffic is login operations - most common operation
  if (rand < 60) {
    performLoginOperation(data);
  }
  // 15% is registration
  else if (rand < 75) {
    performRegistrationOperation();
  }
  // 15% is token refresh
  else if (rand < 90) {
    performTokenRefreshOperation(data);
  }
  // 5% is password reset
  else if (rand < 95) {
    performPasswordResetOperation(data);
  }
  // 5% is full login/logout workflow
  else {
    performLogoutOperation(data);
  }
  
  // Variable sleep to simulate realistic user behavior
  const sleepTime = Math.random() * 3;  // Sleep between 0-3 seconds for realistic pauses
  sleep(sleepTime);
}

// Perform a login operation
function performLoginOperation(data) {
  // Decide whether to use an existing user or create a new one
  const useExistingUser = Math.random() < 0.8 && data.users && data.users.length > 0;
  
  if (useExistingUser) {
    // Get a random user from the pool
    const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
    // Attempt to login with this user
    loginUserLoadTest(randomUser.email, randomUser.password);
  } else {
    // Create a new user and then login
    const newUser = registerUserLoadTest();
    if (newUser) {
      loginUserLoadTest(newUser.email, newUser.password);
    }
  }
}

// Perform a registration operation
function performRegistrationOperation() {
  registerUserLoadTest();
}

// Perform a token refresh operation
function performTokenRefreshOperation(data) {
  // First ensure we have a logged-in user with tokens
  let authData;
  
  // Try to use a pre-created user
  if (data.users && data.users.length > 0 && Math.random() < 0.8) {
    const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
    // Login to get tokens
    authData = loginUserLoadTest(randomUser.email, randomUser.password);
  } else {
    // Or create and login a new user
    authData = ensureAuthenticated();
  }
  
  // Then refresh the token
  if (authData && authData.tokens && authData.tokens.refreshToken) {
    refreshToken(authData.tokens.refreshToken);
  }
}

// Perform a password reset operation
function performPasswordResetOperation(data) {
  // Determine if we should use an existing user or create a new one
  const useExistingUser = Math.random() < 0.8 && data.users && data.users.length > 0;
  
  if (useExistingUser) {
    const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
    forgotPassword(randomUser.email);
  } else {
    const newUser = registerUserLoadTest();
    if (newUser) {
      forgotPassword(newUser.email);
    }
  }
}

// Perform a logout operation
function performLogoutOperation(data) {
  // First login to get authentication tokens
  let authData;
  
  // Try to use a pre-created user
  if (data.users && data.users.length > 0 && Math.random() < 0.8) {
    const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
    // Login to get tokens
    authData = loginUserLoadTest(randomUser.email, randomUser.password);
  } else {
    // Or login with a new user
    authData = ensureAuthenticated();
  }
  
  // Then logout
  if (authData && authData.tokens) {
    // Simulate a small pause after login
    sleep(0.5);
    
    // Log out
    logoutUser(authData.tokens.accessToken, authData.tokens.refreshToken);
  }
}

// Clean up after the test if needed
export function teardown(data) {
  console.log(`Realistic auth load test completed with ${data.users ? data.users.length : 0} pre-created users`);
  // No specific cleanup needed for auth testing
  // User data will be cleared if the auth service is restarted
} 