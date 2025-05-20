@echo off
echo Running realistic load test for menu service...
cd ..\..\..\..\
call pnpm load-test:menu:run realistic
echo Test completed. Check reports for results. 