# PowerShell script to run load tests for food delivery app
# Usage: .\scripts\run-load-tests.ps1 <service-name> [test-type]

param (
    [Parameter(Mandatory=$true)]
    [string]$serviceName,
    
    [Parameter(Mandatory=$false)]
    [string]$testType = "all"
)

# Get the root directory path
$rootDir = Split-Path -Parent $PSScriptRoot

# Define test types based on the service
$menuTestTypes = @("smoke", "baseline", "stress", "spike", "endurance", "realistic")
$authTestTypes = @("baseline", "stress", "realistic")

# Select appropriate test types based on service
$testTypes = if ($serviceName -eq "auth") { $authTestTypes } else { $menuTestTypes }

# Validate service name
$validServices = @("menu", "auth")
if (-not ($validServices -contains $serviceName)) {
    Write-Host "Error: Invalid service name. Must be one of: menu, auth" -ForegroundColor Red
    exit 1
}

# Validate test type
if ($testType -ne "all" -and -not ($testTypes -contains $testType)) {
    if ($serviceName -eq "auth") {
        Write-Host "Error: Invalid test type for auth service. Must be one of: baseline, stress, realistic, all" -ForegroundColor Red
    } else {
        Write-Host "Error: Invalid test type for menu service. Must be one of: smoke, baseline, stress, spike, endurance, realistic, all" -ForegroundColor Red
    }
    exit 1
}

# Disable rate limiting for the service
function Disable-RateLimiting {
    param (
        [string]$service
    )
    
    Write-Host "`n=== Disabling rate limiting for $service service ===" -ForegroundColor Cyan
    
    # Use the Docker script to disable rate limiting
    & "$rootDir\scripts\docker-disable-rate-limiting.ps1" $service
}

# Run a specific load test
function Start-LoadTest {
    param (
        [string]$service,
        [string]$type
    )
    
    Write-Host "`n=== Running $type test for $service service ===" -ForegroundColor Cyan
    
    # Check both possible locations for the test script
    $testScript = Join-Path -Path $rootDir -ChildPath "apps\$service\test\load-test\load-types\${type}-test.js"
    $fallbackScript = Join-Path -Path $rootDir -ChildPath "apps\$service\test\load-test\${type}-test.js"
    
    # Use the correct path based on what exists
    if (-not (Test-Path $testScript)) {
        if (Test-Path $fallbackScript) {
            $testScript = $fallbackScript
        } else {
            Write-Host "Test script not found at either:" -ForegroundColor Yellow
            Write-Host "  - $testScript" -ForegroundColor Yellow
            Write-Host "  - $fallbackScript" -ForegroundColor Yellow
            return $null
        }
    }
    
    $resultsDir = Join-Path -Path $rootDir -ChildPath "apps\$service\test\load-test\results"
    $outputFile = Join-Path -Path $resultsDir -ChildPath "${service}_${type}.json"
    
    # Create results directory if it doesn't exist
    if (-not (Test-Path $resultsDir)) {
        New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
    }
    
    # Run the test
    $summaryFile = Join-Path -Path $resultsDir -ChildPath "${service}_${type}_summary.json"
    k6 run --summary-export=$summaryFile -o "json=$outputFile" $testScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $type test completed successfully" -ForegroundColor Green
        return $summaryFile
    } else {
        Write-Host "❌ $type test failed" -ForegroundColor Red
        return $summaryFile  # Return even if failed, so we can generate a report
    }
}

# Generate report for a test
function New-TestReport {
    param (
        [string]$service,
        [string]$type
    )
    
    Write-Host "`n=== Generating report for $type test ===" -ForegroundColor Cyan
    
    # Use the PowerShell script to create report
    & "$rootDir\scripts\generate-test-report.ps1" -service $service -testType $type
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Report generated successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to generate report" -ForegroundColor Red
    }
}

# Re-enable rate limiting
function Enable-RateLimiting {
    param (
        [string]$service
    )
    
    Write-Host "`n=== Re-enabling rate limiting for $service service ===" -ForegroundColor Cyan
    
    # Use the Docker script to enable rate limiting
    & "$rootDir\scripts\docker-enable-rate-limiting.ps1" $service
}

# Check if k6 is installed
try {
    $k6Version = k6 version
    Write-Host "Using k6 version: $k6Version" -ForegroundColor Cyan
} catch {
    Write-Host "Error: k6 is not installed or not in the PATH. Please install k6 first." -ForegroundColor Red
    Write-Host "Visit https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Disable rate limiting
Disable-RateLimiting -service $serviceName

# Run tests based on test type parameter
if ($testType -eq "all") {
    # Run all tests
    foreach ($type in $testTypes) {
        $jsonFile = Start-LoadTest -service $serviceName -type $type
        if ($jsonFile) {
            New-TestReport -service $serviceName -type $type
        }
    }
} else {
    # Run specific test
    $jsonFile = Start-LoadTest -service $serviceName -type $testType
    if ($jsonFile) {
        New-TestReport -service $serviceName -type $testType
    }
}

# Re-enable rate limiting
Enable-RateLimiting -service $serviceName

Write-Host "`n=== Load testing complete for $serviceName service ===" -ForegroundColor Green
$reportsDir = Join-Path -Path $rootDir -ChildPath "apps\$serviceName\test\load-test\reports"
Write-Host "Reports are available in: $reportsDir" -ForegroundColor Cyan 