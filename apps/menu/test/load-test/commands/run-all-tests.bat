@echo off
setlocal

REM Set colors
set ESC=
set YELLOW=%ESC%[93m
set RESET=%ESC%[0m
set RED=%ESC%[91m
set GREEN=%ESC%[92m

echo %YELLOW%=======================================%RESET%
echo %YELLOW%Menu Service Load Testing Suite%RESET%
echo %YELLOW%=======================================%RESET%
echo.
echo This script will run all load tests in sequence.
echo Results will be saved in the 'results' directory.
echo HTML reports will be generated in the 'test/reports' directory.
echo.
echo %YELLOW%IMPORTANT: Make sure the menu service is running on http://localhost:3002%RESET%
echo.
set /p CONTINUE=Press Enter to start or Ctrl+C to cancel...

REM Check if k6 is installed
echo %YELLOW%Checking prerequisites...%RESET%
k6 version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo %RED%⨯ k6 is not installed or not in your PATH%RESET%
  echo Please install k6 from https://k6.io/docs/get-started/installation/
  exit /b 1
) else (
  echo %GREEN%✓ k6 is installed%RESET%
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo %RED%⨯ Node.js is not installed or not in your PATH%RESET%
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
) else (
  echo %GREEN%✓ Node.js is installed%RESET%
)

REM Create results directory
if not exist "results" mkdir results
echo %GREEN%✓ Results directory created/verified%RESET%

REM Create reports directory
if not exist "..\reports" mkdir ..\reports
echo %GREEN%✓ Reports directory created/verified%RESET%

REM Check if menu service is running
echo %YELLOW%Checking menu service availability...%RESET%
curl -s -o nul -w "%%{http_code}" http://localhost:3002/health > temp.txt
set /p STATUS=<temp.txt
del temp.txt

if "%STATUS%" == "200" (
  echo %GREEN%✓ Menu service is running%RESET%
) else (
  echo %RED%⨯ Menu service does not appear to be running on http://localhost:3002/health%RESET%
  echo %YELLOW%Make sure the menu service is started before running tests.%RESET%
  set /p CONTINUE=Press Enter to continue anyway or Ctrl+C to cancel...
)

echo.

REM Run all load tests for menu service

echo Running all load tests for menu service...

echo.
echo === Running Smoke Test ===
k6 run smoke-test.js
echo.

echo === Running Baseline Test ===
k6 run baseline-test.js
echo.

echo === Running Stress Test ===
k6 run stress-test.js
echo.

echo === Running Spike Test ===
k6 run spike-test.js
echo.

echo === Running Endurance Test ===
k6 run endurance-test.js
echo.

echo === Running Realistic Load Test ===
echo WARNING: This test will run for approximately 30 minutes.
echo Press Ctrl+C to skip this test or wait 5 seconds to continue...
timeout /t 5 /nobreak
k6 run realistic-test.js
echo.

echo All tests completed.
echo To generate reports, run: pnpm run generate-reports:menu

REM Generate HTML report for baseline test
echo %YELLOW%Generating HTML report for baseline test...%RESET%
node auto-generate-report.js results\menu_baseline_results.json baseline
if %ERRORLEVEL% NEQ 0 (
  echo %RED%⨯ Failed to generate baseline test report%RESET%
) else (
  echo %GREEN%✓ Baseline test report generated%RESET%
)

echo.
echo %YELLOW%Waiting 10 seconds before next steps...%RESET%
timeout /t 10 /nobreak > nul

REM Ask before running more intensive tests
set /p CONTINUE=Do you want to continue with more intensive tests? (y/n): 
if /i not "%CONTINUE%"=="y" goto :cleanup

REM Run stress test
echo %YELLOW%=======================================%RESET%
echo %YELLOW%Running stress test...%RESET%
echo %YELLOW%=======================================%RESET%
echo.

k6 run --out json=results\menu_stress_results.json stress-test.js
if %ERRORLEVEL% NEQ 0 (
  echo %RED%⨯ Stress test failed - check the results for details%RESET%
) else (
  echo %GREEN%✓ Stress test completed%RESET%
)

REM Generate HTML report for stress test
echo %YELLOW%Generating HTML report for stress test...%RESET%
node auto-generate-report.js results\menu_stress_results.json stress
if %ERRORLEVEL% NEQ 0 (
  echo %RED%⨯ Failed to generate stress test report%RESET%
) else (
  echo %GREEN%✓ Stress test report generated%RESET%
)

echo.
echo %YELLOW%All tests completed.%RESET%

:cleanup
echo.
echo %YELLOW%=======================================%RESET%
echo %YELLOW%Test Results Summary%RESET%
echo %YELLOW%=======================================%RESET%
echo.
echo Results are saved in the 'results' directory.
echo HTML reports are saved in the 'test/reports' directory.
echo.
echo To view detailed test results, run:
echo k6 report results\menu_baseline_results.json
echo k6 report results\menu_stress_results.json
echo.
echo Or open the HTML reports in a browser from the test/reports directory.
echo.
echo %GREEN%Load testing complete!%RESET%

endlocal 