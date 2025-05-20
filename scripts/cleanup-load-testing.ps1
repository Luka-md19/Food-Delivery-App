# PowerShell script to clean up duplicate and obsolete load testing files
# This script removes files that are no longer needed after migrating to the Docker-based
# rate limiting approach.

Write-Host "Starting cleanup of redundant load testing files..."

# Define files to be removed
$filesToRemove = @(
    # Old toggle scripts (replaced by Docker environment variable approach)
    "apps/menu/test/load-test/toggle-rate-limiting.js",
    "apps/auth/test/load-test/scripts/toggle-rate-limiting.js",
    "libs/common/src/load-testing/cli/toggle-rate-limiting.ts",
    
    # Redundant rate limiting check files (now handled by Docker-based scripts)
    "apps/menu/test/load-test/check-rate-limiting.js",
    "apps/menu/test/load-test/check-rate-limiting-status.bat",
    "apps/auth/test/load-test/scripts/check-rate-limiting.js",
    "apps/auth/test/load-test/scripts/check-rate-limiting-status.bat",
    
    # Old bat files that modify source code directly
    "apps/auth/test/load-test/scripts/enable-rate-limiting.bat",
    "apps/auth/test/load-test/scripts/disable-rate-limiting.bat",
    
    # Redundant report generation scripts (use the main script in /scripts)
    "apps/menu/test/load-test/generate-report.js",
    "apps/auth/test/load-test/generate-report.js"
)

# Get the root directory path
$rootDir = Join-Path -Path $PSScriptRoot -ChildPath ".."

# Remove each file if it exists
foreach ($file in $filesToRemove) {
    $fullPath = Join-Path -Path $rootDir -ChildPath $file
    
    if (Test-Path $fullPath) {
        Write-Host "Removing: $file"
        Remove-Item -Path $fullPath -Force
    } else {
        Write-Host "File not found (already removed): $file"
    }
}

# Update README-LOAD-TESTING.md to reflect the new approach
$readmePath = Join-Path -Path $rootDir -ChildPath "README-LOAD-TESTING.md"
if (Test-Path $readmePath) {
    Write-Host "Updating README-LOAD-TESTING.md to reflect the Docker-based approach..."
    $content = Get-Content -Path $readmePath -Raw
    
    # Only update if it hasn't been updated already
    if ($content -notmatch "docker-enable-rate-limiting\.ps1") {
        $updatedContent = $content -replace "./scripts/docker-enable-rate-limiting.sh", "./scripts/docker-enable-rate-limiting.ps1"
        $updatedContent = $updatedContent -replace "./scripts/docker-disable-rate-limiting.sh", "./scripts/docker-disable-rate-limiting.ps1"
        Set-Content -Path $readmePath -Value $updatedContent
    }
}

Write-Host "Cleanup complete! The codebase now uses a more streamlined Docker-based"
Write-Host "approach for toggling rate limiting via environment variables."
Write-Host ""
Write-Host "To toggle rate limiting, use:"
Write-Host "  - .\scripts\docker-enable-rate-limiting.ps1 [service-name]"
Write-Host "  - .\scripts\docker-disable-rate-limiting.ps1 [service-name]" 