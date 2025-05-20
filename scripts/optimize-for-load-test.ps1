#!/usr/bin/env pwsh
# Optimize the system for load testing

Write-Host "Optimizing system for load testing..." -ForegroundColor Cyan

# 1. Update PostgreSQL settings
Write-Host "Updating PostgreSQL database connection settings..." -ForegroundColor Green
docker-compose exec postgres bash -c "echo 'ALTER SYSTEM SET max_connections = 500;' | psql -U postgres"
docker-compose exec postgres bash -c "echo 'ALTER SYSTEM SET shared_buffers = \"256MB\";' | psql -U postgres"
docker-compose exec postgres bash -c "echo 'ALTER SYSTEM SET work_mem = \"16MB\";' | psql -U postgres"
docker-compose exec postgres bash -c "su - postgres -c 'pg_ctl reload -D /var/lib/postgresql/data'"

# 2. Update Redis settings
Write-Host "Updating Redis settings..." -ForegroundColor Green
docker-compose exec redis bash -c "redis-cli config set maxclients 1000"
docker-compose exec redis bash -c "redis-cli config set timeout 300"
docker-compose exec redis bash -c "redis-cli config set maxmemory-policy allkeys-lru"
docker-compose exec redis bash -c "redis-cli config set maxmemory 256mb"

# 3. Disable rate limiting for all services
Write-Host "Disabling rate limiting for all services..." -ForegroundColor Green
$env:ENABLE_RATE_LIMITING = "false"
pnpm exec powershell -ExecutionPolicy Bypass -File ./scripts/docker-disable-rate-limiting.ps1 auth
pnpm exec powershell -ExecutionPolicy Bypass -File ./scripts/docker-disable-rate-limiting.ps1 menu

# 4. Optimize Node.js settings
Write-Host "Optimizing Node.js settings..." -ForegroundColor Green
# Set these environment variables for services
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# 5. Restart services with optimized settings
Write-Host "Restarting services with optimized settings..." -ForegroundColor Green
docker-compose restart auth
docker-compose restart menu

Write-Host "Optimization complete! The system is now configured for high-load testing." -ForegroundColor Yellow
Write-Host "Run your load tests with increased concurrency and throughput." -ForegroundColor Yellow
Write-Host "Note: To reset these settings, restart the container environment." -ForegroundColor Yellow 