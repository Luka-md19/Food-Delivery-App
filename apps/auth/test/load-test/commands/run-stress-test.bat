@echo off
echo Running stress load test for auth service...
cd ..\..\..\..\
call pnpm load-test:auth:run stress
echo Test completed. Check reports for results. 