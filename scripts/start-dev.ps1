# Start-dev: ensure backend + frontend are running, stop stray vite processes, open browser
$root = 'C:\Users\hp\Desktop\market place'

# 1) Check backend listener (port 3002)
$backendConn = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($backendConn) {
  Write-Output "Backend already listening on 3002 (PID $($backendConn.OwningProcess))."
} else {
  Write-Output "Starting backend in a new PowerShell window (PORT=3002)..."
  Start-Process -FilePath 'powershell' -ArgumentList '-NoExit','-Command',"cd '$root\\backend'; `$env:PORT='3002'; npm run dev"
  Start-Sleep -Seconds 1
}

# 2) Stop stray Vite/roll processes (limit to node processes)
Write-Output "Checking for stray Vite/Roll processes..."
$procMatches = Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -match 'vite' -or $_.CommandLine -match 'roll') -and ($_.Name -match 'node') } | Select-Object ProcessId,CommandLine
if ($matches) {
  foreach ($m in $matches) {
    $procId = $m.ProcessId
    if ($backendConn -and $procId -eq $backendConn.OwningProcess) {
      Write-Output "Skipping backend PID $procId"
    } else {
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Output "Stopped PID $procId"
      } catch {
        Write-Output ("Failed to stop PID {0}: {1}" -f $procId,$_.Exception.Message)
      }
    }
  }
} else {
  Write-Output "No stray Vite/Roll node processes found."
}

# 3) Start frontend in a new PowerShell window
Write-Output "Starting frontend in a new PowerShell window (npm run dev)..."
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit','-Command',"cd '$root\\frontend'; npm run dev"
Start-Sleep -Seconds 1

# 4) Open browser to default Vite port (5173). If Vite used a different port, check the frontend terminal for the printed Local URL.
Try {
  Start-Process 'http://localhost:5173/'
  Write-Output "Opened http://localhost:5173/ in default browser."
} catch {
  Write-Output "Could not open browser automatically: $($_.Exception.Message)"
}

Write-Output "Start-dev script completed. Check the backend and frontend PowerShell windows for logs and the frontend terminal for the exact Vite Local URL."
