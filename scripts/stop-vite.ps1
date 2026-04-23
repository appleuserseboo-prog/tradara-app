$backendConn = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
$backendPid = $null
if ($backendConn) { $backendPid = $backendConn.OwningProcess }
Write-Output ("Backend PID: {0}" -f $backendPid)
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'vite' -or $_.CommandLine -match 'roll' -or $_.CommandLine -match 'frontend' } | Select-Object ProcessId,CommandLine
if ($procs) {
  foreach ($m in $procs) {
    $procId = $m.ProcessId
    if ($procId -ne $backendPid) {
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Output ("Stopped PID {0}" -f $procId)
      } catch {
        Write-Output ("Failed to stop {0}: {1}" -f $procId,$_.Exception.Message)
      }
    } else {
      Write-Output ("Skipping backend PID {0}" -f $procId)
    }
  }
} else {
  Write-Output "No matching processes found"
}

# Show listeners for sanity
Get-NetTCPConnection -LocalPort 3002,5173,5174 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize
