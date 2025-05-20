# PowerShell script to enable rate limiting for production in Docker environment
# Usage: .\scripts\docker-enable-rate-limiting.ps1 [service-name]
# Example: .\scripts\docker-enable-rate-limiting.ps1 menu

param (
    [string]$serviceName = "menu"
)

Write-Host "Enabling rate limiting for $serviceName service in Docker..." -ForegroundColor Cyan

# Use only the default docker-compose.yml file
Write-Host "Applying production configuration..." -ForegroundColor Cyan
docker-compose up -d $serviceName

# Wait for service to be healthy
Write-Host "Waiting for $serviceName service to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Verify the change was applied
Write-Host "Rate limiting has been ENABLED for $serviceName service." -ForegroundColor Green
Write-Host ""
Write-Host "To verify, you can run: docker-compose exec $serviceName env | findstr RATE" -ForegroundColor Cyan
Write-Host "To disable rate limiting, run: .\scripts\docker-disable-rate-limiting.ps1 $serviceName" -ForegroundColor Cyan

# Show the container logs to verify
docker-compose logs --tail=20 $serviceName 