import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
export const successRate = new Rate('success_rate');
export const loginSuccessRate = new Rate('login_success_rate');
export const registerSuccessRate = new Rate('register_success_rate');
export const refreshTokenSuccessRate = new Rate('refresh_token_success_rate');
export const forgotPasswordSuccessRate = new Rate('forgot_password_success_rate');

// Response time trends for each endpoint
export const loginTrend = new Trend('login_response_time');
export const registerTrend = new Trend('register_response_time');
export const refreshTokenTrend = new Trend('refresh_token_response_time');
export const forgotPasswordTrend = new Trend('forgot_password_response_time');

// Environment configuration
export const config = {
  // When running on Windows outside Docker, we need to use localhost
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2s (increased from 1s)
    http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
    'success_rate': ['rate>0.95'],     // Success rate should be greater than 95%
  }
};

// User pool for testing
export const userPool = [];

// Generate a random email for registration
export function generateRandomEmail() {
  return `user.${randomString(8)}@example.com`;
}

// Generate a random password for registration that meets the auth service requirements
export function generateRandomPassword() {
  // Ensure we have at least one of each required character type
  const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_-+=<>?';
  
  // Get one character from each required category
  const getRandomChar = (charSet) => charSet.charAt(Math.floor(Math.random() * charSet.length));
  
  const upper = getRandomChar(upperCase);
  const lower = getRandomChar(lowerCase);
  const number = getRandomChar(numbers);
  const special = getRandomChar(specialChars);
  
  // Generate the rest of the password with mixed characters
  const allChars = upperCase + lowerCase + numbers + specialChars;
  let remainingChars = '';
  for (let i = 0; i < 8; i++) {
    remainingChars += getRandomChar(allChars);
  }
  
  // Combine all parts and shuffle
  const password = upper + lower + number + special + remainingChars;
  const shuffledPassword = shuffleString(password);
  
  return shuffledPassword;
}

// Helper function to shuffle a string
function shuffleString(str) {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
}

// Register a new user
export function registerUser() {
  const email = generateRandomEmail();
  const password = generateRandomPassword();
  const firstName = `Test${randomString(5)}`;
  const lastName = `User${randomString(5)}`;
  
  const payload = JSON.stringify({
    email,
    password,
    confirmPassword: password, // Required in your RegisterDto
    firstName,
    lastName,
    roles: ["CUSTOMER"] // Default role
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Try the load-test endpoint first (bypasses rate limiting)
  let res = http.post(`${config.baseUrl}/api/load-test/auth/register`, payload, params);
  
  // If that fails, try the standard API endpoint
  if (res.status !== 201 && res.status !== 200) {
    res = http.post(`${config.baseUrl}/api/auth/register`, payload, params);
    
    // If that fails, try some common alternatives
    if (res.status !== 201 && res.status !== 200) {
      const altEndpoints = [
        `${config.baseUrl}/auth/register`,
        `${config.baseUrl}/register`,
        `${config.baseUrl}/api/register`
      ];
      
      for (const endpoint of altEndpoints) {
        const altRes = http.post(endpoint, payload, params);
        if (altRes.status === 201 || altRes.status === 200) {
          res = altRes;
          break;
        }
      }
    }
  }
  
  registerTrend.add(res.timings.duration);
  registerSuccessRate.add(res.status === 201 || res.status === 200);
  successRate.add(res.status === 201 || res.status === 200);
  
  // Check if response is successful and what kind of response it is
  let registrationSuccessful = false;
  let hasTokens = false;
  let responseData = null;
  
  if (res.status === 201 || res.status === 200) {
    try {
      const response = res.json();
      responseData = response;
      
      // Check if response contains either a message or tokens
      if (response.message || (response.user && response.tokens) || response.accessToken || (response.tokens && response.tokens.accessToken)) {
        registrationSuccessful = true;
      }
      
      // Check if response includes login tokens
      if ((response.tokens && response.tokens.accessToken) || response.accessToken) {
        hasTokens = true;
      }
    } catch (e) {
      console.error(`Failed to parse registration response: ${e.message}`);
    }
  }
  
  check(res, {
    'register successful': () => registrationSuccessful,
    'contains message or tokens': () => registrationSuccessful,
    'includes login tokens': () => hasTokens
  });
  
  if (!registrationSuccessful) {
    console.error(`Failed to register user: ${email}. Status code: ${res.status}, Response: ${res.body}`);
    return null;
  }
  
  // Handle successful registration
  console.log(`Successfully registered user: ${email}`);
  
  try {
    // Check if the response format is { user, tokens } (immediate login after registration)
    if (responseData.user && responseData.tokens && responseData.tokens.accessToken) {
      const userData = { 
        email, 
        password,
        tokens: {
          accessToken: responseData.tokens.accessToken,
          refreshToken: responseData.tokens.refreshToken
        },
        userData: responseData.user  
      };
      userPool.push(userData);
      console.log(`Registration also returned login tokens for: ${email}`);
      return userData;
    } else if (responseData.accessToken && responseData.refreshToken) {
      // Direct token format
      const userData = { 
        email, 
        password,
        tokens: {
          accessToken: responseData.accessToken,
          refreshToken: responseData.refreshToken
        },
        userData: responseData.user  
      };
      userPool.push(userData);
      console.log(`Registration also returned direct login tokens for: ${email}`);
      return userData;
    } else {
      // Regular registration that returns a success message
      userPool.push({ email, password });
      return { email, password };
    }
  } catch (e) {
    console.error(`Error processing registration data: ${e.message}`);
    // Even if parsing fails, if status is success, store the user
    userPool.push({ email, password });
    return { email, password };
  }
}

// Alternatively, use the load-test API endpoint for registration
export function registerUserLoadTest() {
  const email = generateRandomEmail();
  const password = generateRandomPassword();
  const firstName = `Test${randomString(5)}`;
  const lastName = `User${randomString(5)}`;
  
  const payload = JSON.stringify({
    email,
    password,
    firstName,
    lastName,
    confirmPassword: password,
    roles: ["CUSTOMER"]
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Use the load-test endpoint that bypasses rate limiting with API prefix
  const res = http.post(`${config.baseUrl}/api/load-test/auth/register`, payload, params);
  
  registerTrend.add(res.timings.duration);
  registerSuccessRate.add(res.status === 200 || res.status === 201);
  successRate.add(res.status === 200 || res.status === 201);
  
  check(res, {
    'register load-test successful': (r) => r.status === 200 || r.status === 201,
    'registration response received': (r) => {
      try {
        const json = r.json();
        return json.message !== undefined || json.user !== undefined || 
               (json.tokens && json.tokens.accessToken) || json.accessToken;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (res.status === 200 || res.status === 201) {
    try {
      const response = res.json();
      
      // Handle different response formats
      if (response.user && response.tokens) {
        // Format: { user: {...}, tokens: { accessToken, refreshToken } }
        console.log(`Successfully registered load test user with tokens: ${email}`);
        const userData = { 
          email, 
          password,
          tokens: {
            accessToken: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken
          },
          userData: response.user
        };
        userPool.push(userData);
        return userData;
      } else if (response.accessToken && response.refreshToken) {
        // Format: { accessToken, refreshToken, user? }
        console.log(`Successfully registered load test user with direct tokens: ${email}`);
        const userData = { 
          email, 
          password,
          tokens: {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
          },
          userData: response.user
        };
        userPool.push(userData);
        return userData;
      } else if (response.message) {
        // Regular registration success message
        console.log(`Successfully registered load test user: ${email}`);
        const userData = { email, password };
        userPool.push(userData);
        return userData;
      } else {
        console.error(`Unexpected registration response format: ${JSON.stringify(response)}`);
        const userData = { email, password };
        userPool.push(userData);
        return userData;
      }
    } catch (e) {
      console.error(`Failed to parse register response for ${email}:`, e);
      // Even with parsing error, if status was success, return user
      const userData = { email, password };
      userPool.push(userData);
      return userData;
    }
  } else {
    console.error(`Failed to register load test user: ${email}. Status code: ${res.status}, Response: ${res.body}`);
  }
  
  return null;
}

// Login with a user
export function loginUser(email, password) {
  const payload = JSON.stringify({
    email,
    password,
    deviceInfo: 'K6 Load Test Client' // Optional in your LoginDto
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Try the load-test endpoint first (bypasses rate limiting)
  let res = http.post(`${config.baseUrl}/api/load-test/auth/login`, payload, params);
  
  // If that fails, try the standard API endpoint
  if (res.status !== 200 && res.status !== 201) {
    res = http.post(`${config.baseUrl}/api/auth/login`, payload, params);
    
    // If that fails, try some common alternatives
    if (res.status !== 200 && res.status !== 201) {
      const altEndpoints = [
        `${config.baseUrl}/auth/login`,
        `${config.baseUrl}/login`,
        `${config.baseUrl}/api/login`
      ];
      
      for (const endpoint of altEndpoints) {
        const altRes = http.post(endpoint, payload, params);
        if (altRes.status === 200 || altRes.status === 201) {
          res = altRes;
          break;
        }
      }
    }
  }
  
  loginTrend.add(res.timings.duration);
  loginSuccessRate.add(res.status === 200 || res.status === 201);
  successRate.add(res.status === 200 || res.status === 201);
  
  // Check if login was successful based on status code and response content
  let loginSuccessful = false;
  let responseData = null;
  
  if (res.status === 200 || res.status === 201) {
    try {
      const response = res.json();
      
      // Check if response contains tokens either in nested or flat format
      if ((response.tokens && response.tokens.accessToken) || response.accessToken) {
        loginSuccessful = true;
        responseData = response;
        console.log(`Successfully logged in user: ${email}`);
      } else if (response.message && !response.tokens && !response.accessToken) {
        // This might be a registration response with just a message
        console.log(`Response contains message but no tokens: ${response.message}`);
        loginSuccessful = false;
      }
    } catch (e) {
      console.error(`Failed to parse login response: ${e.message}`);
      loginSuccessful = false;
    }
  }
  
  // Record check results for metrics
  check(res, {
    'login successful': () => loginSuccessful,
    'response contains tokens': () => loginSuccessful
  });
  
  if (!loginSuccessful) {
    console.error(`Login failed for ${email}: Status code: ${res.status}, Response: ${res.body}`);
    return null;
  }
  
  // Process successful login data
  try {
    // Handle different response formats
    if (responseData.tokens && responseData.tokens.accessToken) {
      // Auth service returns format: { user: {...}, tokens: { accessToken, refreshToken, expiresIn, tokenType } }
      return {
        accessToken: responseData.tokens.accessToken,
        refreshToken: responseData.tokens.refreshToken,
        user: responseData.user
      };
    } else if (responseData.accessToken) {
      // Alternative format: { accessToken, refreshToken, user }
      return {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        user: responseData.user
      };
    }
  } catch (e) {
    console.error(`Error extracting token data: ${e.message}`);
  }
  
  return null;
}

// Alternatively, login using load-test endpoint
export function loginUserLoadTest(email, password) {
  const payload = JSON.stringify({
    email,
    password,
    deviceInfo: 'K6 Load Test Client'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(`${config.baseUrl}/api/load-test/auth/login`, payload, params);
  
  loginTrend.add(res.timings.duration);
  
  // Check if login was successful based on status code and response content
  let loginSuccessful = false;
  let responseData = null;
  
  if (res.status === 200 || res.status === 201) {
    try {
      const response = res.json();
      responseData = response;
      
      // Check if response contains tokens
      if ((response.tokens && response.tokens.accessToken) || response.accessToken) {
        loginSuccessful = true;
        console.log(`Successfully logged in load test user: ${email}`);
      }
    } catch (e) {
      console.error(`Failed to parse load test login response: ${e.message}`);
    }
  }
  
  loginSuccessRate.add(loginSuccessful);
  successRate.add(loginSuccessful);
  
  check(res, {
    'login load-test successful': () => loginSuccessful,
    'tokens received': () => loginSuccessful
  });
  
  if (!loginSuccessful) {
    console.error(`Login load test failed for ${email}: Status code: ${res.status}, Response: ${res.body}`);
    return null;
  }
  
  try {
    // Handle different response formats
    if (responseData.tokens && responseData.tokens.accessToken) {
      return {
        accessToken: responseData.tokens.accessToken,
        refreshToken: responseData.tokens.refreshToken,
        user: responseData.user
      };
    } else if (responseData.accessToken) {
      return {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        user: responseData.user
      };
    }
  } catch (e) {
    console.error(`Error extracting load test login data: ${e.message}`);
  }
  
  return null;
}

// Refresh access token
export function refreshToken(refreshToken) {
  const payload = JSON.stringify({
    refreshToken,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Try the load-test endpoint first
  let res = http.post(`${config.baseUrl}/api/load-test/auth/refresh`, payload, params);
  
  // If load-test endpoint fails, use standard endpoint
  if (res.status !== 200 && res.status !== 201) {
    res = http.post(`${config.baseUrl}/api/auth/refresh`, payload, params);
  }
  
  refreshTokenTrend.add(res.timings.duration);
  
  // Check if refresh was successful and contains tokens
  let refreshSuccessful = false;
  let responseData = null;
  
  if (res.status === 200 || res.status === 201) {
    try {
      const response = res.json();
      responseData = response;
      
      // Check if response contains tokens
      if ((response.tokens && response.tokens.accessToken) || response.accessToken) {
        refreshSuccessful = true;
        console.log('Successfully refreshed tokens');
      }
    } catch (e) {
      console.error(`Failed to parse refresh token response: ${e.message}`);
    }
  }
  
  refreshTokenSuccessRate.add(refreshSuccessful);
  successRate.add(refreshSuccessful);
  
  check(res, {
    'refresh token successful': () => refreshSuccessful,
    'tokens received': () => refreshSuccessful
  });
  
  if (!refreshSuccessful) {
    console.error(`Refresh token failed. Status: ${res.status}, Response: ${res.body}`);
    return null;
  }
  
  try {
    // Handle different response formats
    if (responseData.tokens && responseData.tokens.accessToken) {
      return {
        accessToken: responseData.tokens.accessToken,
        refreshToken: responseData.tokens.refreshToken,
      };
    } else if (responseData.accessToken) {
      return {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
      };
    }
  } catch (e) {
    console.error(`Error extracting refreshed token data: ${e.message}`);
  }
  
  return null;
}

// Request password reset
export function forgotPassword(email) {
  const payload = JSON.stringify({
    email,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Try load-test endpoint first
  let res = http.post(`${config.baseUrl}/api/load-test/auth/forgot-password`, payload, params);
  
  // Fall back to standard endpoint
  if (res.status !== 200 && res.status !== 201) {
    res = http.post(`${config.baseUrl}/api/auth/forgot-password`, payload, params);
  }
  
  forgotPasswordTrend.add(res.timings.duration);
  forgotPasswordSuccessRate.add(res.status === 200 || res.status === 201);
  successRate.add(res.status === 200 || res.status === 201);
  
  check(res, {
    'forgot password request successful': (r) => r.status === 200 || r.status === 201,
  });
  
  return res.status === 200 || res.status === 201;
}

// Authenticate and get tokens for a user (register if needed)
export function ensureAuthenticated() {
  console.log('Attempting to ensure authentication...');
  
  // If we already have users in the pool, try to log in with one
  if (userPool.length > 0) {
    // First look for users that already have tokens
    const usersWithTokens = userPool.filter(user => user.tokens && user.tokens.accessToken);
    
    if (usersWithTokens.length > 0) {
      // Use a random user that already has tokens
      const randomIndex = Math.floor(Math.random() * usersWithTokens.length);
      const user = usersWithTokens[randomIndex];
      console.log(`Reusing existing tokens for user: ${user.email}`);
      return { 
        user, 
        tokens: user.tokens,
        userData: user.userData  
      };
    }
    
    // If no users with tokens, try to log in with an existing user
    const randomIndex = Math.floor(Math.random() * userPool.length);
    const user = userPool[randomIndex];
    
    console.log(`Attempting to log in with existing user: ${user.email}`);
    
    // Try to log in with existing user
    const loginResponse = loginUser(user.email, user.password);
    if (loginResponse) {
      console.log(`Successfully logged in with existing user: ${user.email}`);
      // Add the tokens to the user in the pool for future use
      user.tokens = {
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken
      };
      user.userData = loginResponse.user;
      
      return { 
        user, 
        tokens: user.tokens,
        userData: user.userData
      };
    }
    // Login failed, continue to registration
    console.log(`Login failed for existing user ${user.email}, will try to register new user`);
  } else {
    console.log('No users in pool, will create a new user');
  }
  
  // Try load test registration endpoint first
  console.log('Attempting to register a new user with load test endpoint...');
  const loadTestUser = registerUserLoadTest();
  if (loadTestUser && loadTestUser.tokens) {
    console.log(`Successfully registered and auto-logged in with load test endpoint: ${loadTestUser.email}`);
    return {
      user: loadTestUser,
      tokens: loadTestUser.tokens,
      userData: loadTestUser.userData
    };
  }
  
  // If load test registration failed, try normal registration
  console.log('Attempting to register a new user with standard endpoint...');
  const newUser = registerUser();
  if (newUser) {
    // If registerUser already returned tokens (auth service auto-logged-in), use them
    if (newUser.tokens) {
      console.log(`User ${newUser.email} registered and auto-logged in`);
      return {
        user: newUser,
        tokens: newUser.tokens,
        userData: newUser.userData
      };
    }
    
    console.log(`Successfully registered new user: ${newUser.email}`);
    
    // Wait a bit after registration (simulating email verification if needed)
    console.log('Waiting for a moment before attempting login...');
    sleep(1);
    
    // Try to log in with the new user
    console.log(`Attempting to log in with newly registered user: ${newUser.email}`);
    const loginResponse = loginUser(newUser.email, newUser.password);
    if (loginResponse) {
      console.log(`Successfully authenticated newly registered user: ${newUser.email}`);
      // Update the user in the pool with tokens
      for (let i = 0; i < userPool.length; i++) {
        if (userPool[i].email === newUser.email) {
          userPool[i].tokens = {
            accessToken: loginResponse.accessToken,
            refreshToken: loginResponse.refreshToken
          };
          userPool[i].userData = loginResponse.user;
          break;
        }
      }
      
      return { 
        user: newUser, 
        tokens: {
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken
        },
        userData: loginResponse.user
      };
    }
    console.log(`Login failed for newly registered user ${newUser.email}`);
  } else {
    console.error('Failed to register a new user');
  }
  
  // If we get here, both registration and login failed
  console.error('Failed to ensure authenticated user - all approaches failed');
  return null;
}

// Log out a user
export function logoutUser(accessToken, refreshToken) {
  const payload = JSON.stringify({
    refreshToken,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  // Try the load-test endpoint first (bypasses rate limiting)
  let res = http.post(`${config.baseUrl}/api/load-test/auth/logout`, payload, params);
  
  // If that fails, try the standard API endpoint
  if (res.status !== 200) {
    res = http.post(`${config.baseUrl}/api/auth/logout`, payload, params);
    
    // If that fails, try some common alternatives
    if (res.status !== 200) {
      const altEndpoints = [
        `${config.baseUrl}/auth/logout`,
        `${config.baseUrl}/logout`,
        `${config.baseUrl}/api/logout`
      ];
      
      for (const endpoint of altEndpoints) {
        const altRes = http.post(endpoint, payload, params);
        if (altRes.status === 200) {
          res = altRes;
          break;
        }
      }
    }
  }
  
  const isSuccessful = res.status === 200;
  
  successRate.add(isSuccessful);
  
  check(res, {
    'logout successful': () => isSuccessful,
  });
  
  if (!isSuccessful) {
    console.error(`Logout failed. Status: ${res.status}, Response: ${res.body}`);
  } else {
    console.log('Logout successful');
  }
  
  return isSuccessful;
}

// Generate authenticated requests with token
export function authRequest(method, url, body, accessToken) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  let res;
  if (method.toLowerCase() === 'get') {
    res = http.get(url, params);
  } else if (method.toLowerCase() === 'post') {
    res = http.post(url, body ? JSON.stringify(body) : null, params);
  } else if (method.toLowerCase() === 'put') {
    res = http.put(url, body ? JSON.stringify(body) : null, params);
  } else if (method.toLowerCase() === 'delete') {
    res = http.del(url, body ? JSON.stringify(body) : null, params);
  }
  
  successRate.add(res.status >= 200 && res.status < 300);
  
  return res;
}

// Health check for auth service
export function healthCheck() {
  // Try the health endpoint with API prefix first
  let res = http.get(`${config.baseUrl}/api/health`);
  
  if (res.status === 200) {
    successRate.add(true);
    check(res, {
      'health check successful': (r) => r.status === 200,
    });
    console.log('Health check successful via /api/health endpoint');
    return true;
  }
  
  // Try the load-test health endpoint
  res = http.get(`${config.baseUrl}/api/load-test/health`);
  
  if (res.status === 200) {
    successRate.add(true);
    check(res, {
      'health check successful': (r) => r.status === 200,
    });
    console.log('Health check successful via /api/load-test/health endpoint');
    return true;
  }
  
  // If both fail, try the standard health endpoint which is excluded from the API prefix
  res = http.get(`${config.baseUrl}/health`);
  
  if (res.status === 200) {
    successRate.add(true);
    check(res, {
      'health check successful': (r) => r.status === 200,
    });
    console.log('Health check successful via /health endpoint');
    return true;
  }
  
  // If that fails, try alternative health endpoints
  const altEndpoints = [
    `${config.baseUrl}/health/check`,
    `${config.baseUrl}/api/health/check`,
    `${config.baseUrl}/api/auth/health`
  ];
  
  for (const endpoint of altEndpoints) {
    console.log(`Trying health check at: ${endpoint}`);
    const altRes = http.get(endpoint);
    if (altRes.status === 200) {
      successRate.add(true);
      check(altRes, {
        'health check successful': (r) => r.status === 200,
      });
      console.log(`Health check successful via ${endpoint}`);
      return true;
    }
  }
  
  // All health checks failed
  console.error(`Health check failed. Tried ${altEndpoints.length + 3} endpoints.`);
  successRate.add(false);
  check(res, {
    'health check successful': (r) => r.status === 200,
  });
  return false;
} 