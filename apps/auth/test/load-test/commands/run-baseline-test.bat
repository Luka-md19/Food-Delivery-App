@echo off
echo Running baseline load test for auth service...
cd ..\..\..\..\
call pnpm load-test:auth:run baseline
echo Test completed. Check reports for results. 