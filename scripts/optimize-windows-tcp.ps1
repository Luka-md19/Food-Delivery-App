#!/usr/bin/env pwsh
# Run as administrator to optimize Windows TCP settings for load testing

Write-Host "Optimizing Windows TCP settings for load testing..." -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: This script must be run as Administrator. Please restart PowerShell as Administrator." -ForegroundColor Red
    exit 1
}

# 1. Increase the range of ephemeral ports
Write-Host "Increasing ephemeral port range..." -ForegroundColor Green
netsh int ipv4 set dynamicport tcp start=10000 num=55535
netsh int ipv4 set dynamicport udp start=10000 num=55535

# 2. Reduce TIME_WAIT delay
Write-Host "Setting TCP TIME_WAIT delay to 30 seconds..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpTimedWaitDelay" -Value 30 -PropertyType DWORD -Force | Out-Null

# 3. Enable TCP Fast Timers
Write-Host "Enabling TCP Fast Timers..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpInitialRtt" -Value 1 -PropertyType DWORD -Force | Out-Null

# 4. Enable SYN attack protection
Write-Host "Enabling SYN attack protection..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "SynAttackProtect" -Value 1 -PropertyType DWORD -Force | Out-Null

# 5. Increase TCP window size
Write-Host "Optimizing TCP window size..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "Tcp1323Opts" -Value 1 -PropertyType DWORD -Force | Out-Null

# 6. Enable TCP keepalives
Write-Host "Enabling TCP keepalives..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "KeepAliveTime" -Value 30000 -PropertyType DWORD -Force | Out-Null

# 7. Increase maximum number of user ports
Write-Host "Increasing maximum number of user ports..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "MaxUserPort" -Value 65534 -PropertyType DWORD -Force | Out-Null

# 8. Enable socket reuse
Write-Host "Enabling socket reuse..." -ForegroundColor Green
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpTimedWaitDelay" -Value 30 -PropertyType DWORD -Force | Out-Null

Write-Host "TCP settings have been optimized! A system restart is recommended for all changes to take effect." -ForegroundColor Yellow
Write-Host "You should now be able to run high-load tests more effectively." -ForegroundColor Yellow 