@echo off
echo Running Realistic Auth Load Test

:: Set environment variables for the test
set AUTH_URL=http://auth:3000
set TEST_USER_EMAIL=testuser@example.com
set TEST_USER_PASSWORD=Password123!
set BASE_URL=http://menu:3002
set K6_TIMEOUT=60s
set K6_NO_CONNECTION_REUSE=false
set K6_DNS_PREFETCH=true
set K6_BATCH_PER_HOST=4
set K6_TCP_REUSE=true
set K6_NET_DIAL_TIMEOUT=10s

:: Check if local mode is enabled (default is Docker mode)
if "%USE_LOCAL%"=="true" (
  echo Using localhost URLs
  set AUTH_URL=http://localhost:3000
  set BASE_URL=http://localhost:3002
)

echo Before running this test, please run 'scripts/optimize-windows-tcp.ps1' as Administrator
echo to increase Windows connection limits.

:: Run the test
echo Running test with auth bypass cache...
cd ..
docker run --rm --network=food-delivery-app_food-delivery-network -v %cd%:/scripts ^
  -e AUTH_URL=%AUTH_URL% ^
  -e TEST_USER_EMAIL=%TEST_USER_EMAIL% ^
  -e TEST_USER_PASSWORD=%TEST_USER_PASSWORD% ^
  -e BASE_URL=%BASE_URL% ^
  -e K6_TIMEOUT=%K6_TIMEOUT% ^
  -e K6_NO_CONNECTION_REUSE=%K6_NO_CONNECTION_REUSE% ^
  -e K6_DNS_PREFETCH=%K6_DNS_PREFETCH% ^
  -e K6_BATCH_PER_HOST=%K6_BATCH_PER_HOST% ^
  -e K6_TCP_REUSE=%K6_TCP_REUSE% ^
  -e K6_NET_DIAL_TIMEOUT=%K6_NET_DIAL_TIMEOUT% ^
  grafana/k6 run --no-usage-report --no-summary --compatibility-mode=extended /scripts/load-types/realistic-auth-test.js

echo Test completed. Results will be available in the results directory. 