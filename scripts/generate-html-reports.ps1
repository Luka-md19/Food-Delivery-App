# PowerShell script to generate HTML reports for all load test types
# Usage: .\scripts\generate-html-reports.ps1 [service]

param (
    [string]$serviceName = "all"
)

# Get the root directory path
$rootDir = Split-Path -Parent $PSScriptRoot

function New-TestReport {
    param (
        [string]$service,
        [string]$testType
    )
    
    $resultsFile = Join-Path -Path $rootDir -ChildPath "apps/$service/test/load-test/results/${service}_${testType}.json"
    
    # Check if results file exists
    if (Test-Path $resultsFile) {
        Write-Host "Generating $testType report for $service service..."
        
        # Use the PowerShell script to generate the report
        & "$rootDir\scripts\generate-test-report.ps1" -service "$service" -testType "$testType"
        
        if ($LASTEXITCODE -eq 0) {
            $outputFile = Join-Path -Path $rootDir -ChildPath "apps/$service/test/load-test/reports/${service}_${testType}.html"
            Write-Host "✅ Generated report: $outputFile" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to generate report for $service $testType" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Results file not found: $resultsFile" -ForegroundColor Yellow
    }
}

# Define test types for each service
$menuTestTypes = @("smoke", "baseline", "stress", "spike", "endurance", "realistic")
$authTestTypes = @("baseline", "stress", "realistic")

# Process based on service parameter
if ($serviceName -eq "all") {
    $services = @("menu", "auth")
    Write-Host "Generating reports for all services..." -ForegroundColor Cyan
} else {
    $services = @($serviceName)
    Write-Host "Generating reports for $serviceName service..." -ForegroundColor Cyan
}

# Create reports directory if it doesn't exist
foreach ($service in $services) {
    $reportsDir = Join-Path -Path $rootDir -ChildPath "apps/$service/test/load-test/reports"
    if (-not (Test-Path $reportsDir)) {
        New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
        Write-Host "Created reports directory: $reportsDir" 
    }
}

# Generate reports for each service and test type
foreach ($service in $services) {
    Write-Host "`nProcessing $service service reports..." -ForegroundColor Cyan
    
    # Select appropriate test types based on service
    $testTypes = if ($service -eq "auth") { $authTestTypes } else { $menuTestTypes }
    
    foreach ($testType in $testTypes) {
        New-TestReport -service $service -testType $testType
    }
}

Write-Host "`nReport generation complete!" -ForegroundColor Green
Write-Host "Reports are available in the following locations:"
foreach ($service in $services) {
    Write-Host "- apps/$service/test/load-test/reports/" -ForegroundColor Cyan
} 