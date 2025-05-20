@echo off
echo Running important load tests for auth service (baseline, stress, realistic)...
cd ..\..\..\..\
call pnpm load-test:auth:all
echo All tests completed. Check reports directory for results. 