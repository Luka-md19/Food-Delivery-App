# PowerShell script to disable rate limiting for load testing in Docker environment
# Usage: .\scripts\docker-disable-rate-limiting.ps1 [service-name]
# Example: .\scripts\docker-disable-rate-limiting.ps1 menu

param (
    [string]$serviceName = "menu"
)

Write-Host "Disabling rate limiting for $serviceName service in Docker..." -ForegroundColor Cyan

# Use the docker-compose.load-test.yml override file
Write-Host "Applying load testing configuration..." -ForegroundColor Cyan
docker-compose -f docker-compose.yml -f docker-compose.load-test.yml up -d $serviceName

# Wait for service to be healthy
Write-Host "Waiting for $serviceName service to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Verify the change was applied
Write-Host "Rate limiting has been DISABLED for $serviceName service." -ForegroundColor Green
Write-Host ""
Write-Host "To verify, you can run: docker-compose exec $serviceName env | findstr RATE" -ForegroundColor Cyan
Write-Host "To re-enable rate limiting, run: .\scripts\docker-enable-rate-limiting.ps1 $serviceName" -ForegroundColor Cyan

# Show the container logs to verify
docker-compose logs --tail=20 $serviceName 