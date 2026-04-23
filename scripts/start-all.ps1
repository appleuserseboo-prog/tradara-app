# Start-all.ps1 - Unified script to start backend and frontend with all cleanup

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = "c:\Users\hp\Desktop\market place"

Write-Host "=== Marketplace App Startup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all node processes to avoid port conflicts
Write-Host "Step 1: Cleaning up stray node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# Step 2: Kill specific PIDs using ports 5000 and 5173
Write-Host "Step 2: Freeing ports 5000 and 5173..." -ForegroundColor Yellow
$ports = @(5000, 5173)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 } | Select-Object -Unique OwningProcess
    if ($conn) {
        foreach ($proc in $conn) {
            Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Milliseconds 500

# Step 3: Start Backend in a new PowerShell window
Write-Host "Step 3: Starting backend server on port 5000..." -ForegroundColor Yellow
$backendCmd = "cd '$projectRoot\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Milliseconds 1000

# Step 4: Start Frontend in a new PowerShell window
Write-Host "Step 4: Starting frontend server on port 5173..." -ForegroundColor Yellow
$frontendCmd = "cd '$projectRoot\frontend'; `$env:PORT=5173; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Start-Sleep -Milliseconds 1000

# Step 5: Wait for servers to be ready
Write-Host "Step 5: Waiting for servers to be ready..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
$backendUp = $false
$frontendUp = $false

while ($waited -lt $maxWait) {
    if (-not $backendUp) {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response -and $response.StatusCode -eq 200) {
            $backendUp = $true
            Write-Host "  Backend ready!" -ForegroundColor Green
        }
    }
    if (-not $frontendUp) {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response -and $response.StatusCode -eq 200) {
            $frontendUp = $true
            Write-Host "  Frontend ready!" -ForegroundColor Green
        }
    }
    if ($backendUp -and $frontendUp) { break }
    Start-Sleep -Milliseconds 1000
    $waited++
}

# Step 6: Open browser
Write-Host "Step 6: Opening browser to http://localhost:5173..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=== Startup Complete ===" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green

