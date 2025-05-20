@echo off
echo Migrating existing test results to work with the shared utilities...

rem Create necessary directories
mkdir results 2>nul
mkdir ..\reports 2>nul

rem Look for existing result files and rename them to the new format
if exist baseline-results.json (
  echo Migrating baseline-results.json to results/menu_baseline_results.json
  copy baseline-results.json results\menu_baseline_results.json
)

if exist stress-results.json (
  echo Migrating stress-results.json to results/menu_stress_results.json
  copy stress-results.json results\menu_stress_results.json
)

rem Check in the results directory if files already exist there
cd results
if exist baseline-test.json (
  echo Migrating results/baseline-test.json to results/menu_baseline_results.json
  copy baseline-test.json menu_baseline_results.json
)

if exist stress-test.json (
  echo Migrating results/stress-test.json to results/menu_stress_results.json
  copy stress-test.json menu_stress_results.json
)
cd ..

rem Generate HTML reports for any migrated files
echo Generating HTML reports from migrated results...

if exist results\menu_baseline_results.json (
  echo Generating HTML report for baseline test...
  pnpm run load-test:report results/menu_baseline_results.json menu "Baseline Test" ..\reports/menu_baseline_report.html
)

if exist results\menu_stress_results.json (
  echo Generating HTML report for stress test...
  pnpm run load-test:report results/menu_stress_results.json menu "Stress Test" ..\reports/menu_stress_report.html
)

echo Migration complete!
echo.
echo Reports are available in: ..\reports 