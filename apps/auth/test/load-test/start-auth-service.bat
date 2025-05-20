@echo off
setlocal

echo Building Auth Service...
cd ..\..\..\..\
call pnpm run build:auth

echo Starting Auth Service...
set NODE_ENV=development
set AUTH_PORT=3000
set PORT=3000
set RATE_LIMIT_ENABLED=false
set DB_NAME=food-delivery-auth
set API_PREFIX=api
echo Rate limiting disabled for load testing
start "Auth Service" cmd /k "node dist/apps/auth/main.js"

echo Auth Service is starting at http://localhost:3000
echo API endpoints will be available at http://localhost:3000/api
echo Health endpoint is available at http://localhost:3000/health
echo Wait a few moments before running tests.
echo You can check if the service is ready by navigating to http://localhost:3000/health in your browser.
echo Press Ctrl+C in the Auth Service window to stop the service when done testing.

endlocal 