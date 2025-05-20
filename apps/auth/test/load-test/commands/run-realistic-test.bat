@echo off
echo Running realistic load test for auth service...
cd ..\..\..\..\
call pnpm load-test:auth:run realistic
echo Test completed. Check reports for results. 