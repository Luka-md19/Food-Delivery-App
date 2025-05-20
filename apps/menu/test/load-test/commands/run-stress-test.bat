@echo off
setlocal

echo This script will run the stress load test for the menu service.
echo Before running this test, make sure the menu service is started.
echo NOTE: This is a high-intensity test that will put significant load on your system.

echo Checking if k6 is installed...
k6 version 2>NUL
if %ERRORLEVEL% NEQ 0 (
  echo k6 is not installed or not in your PATH.
  echo Please install k6 from https://k6.io/docs/get-started/installation/
  exit /b 1
)

echo Checking if Node.js is installed...
node --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed or not in your PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

echo Creating results directory if it doesn't exist...
if not exist "results" mkdir results

echo Are you sure you want to run the stress test? This will simulate up to 100 concurrent users. (y/n)
set /p confirm=

if /i not "%confirm%"=="y" (
  echo Stress test cancelled.
  exit /b 0
)

echo Running warm-up requests to prime connections and caches...
k6 run --vus 5 --duration 5s --quiet stress-test.js
echo Warm-up completed. Waiting 5 seconds before starting main test...
timeout /t 5 /nobreak > NUL

echo Running stress load test...
echo Test will run with gradually increasing load up to 100 VUs over 4 minutes.
k6 run --out json=results/menu_stress_results.json stress-test.js

echo Test completed. Results saved to results/menu_stress_results.json

echo Would you like to view a summary of the results? (y/n)
set /p view_results=

if /i "%view_results%"=="y" (
  echo Generating summary...
  k6 run --no-usage-report --quiet --summary stress-test.js
)

endlocal 