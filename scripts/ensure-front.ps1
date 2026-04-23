# Ensure front port 5173 is free (but don't stop backend on 3002)
$front = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
$back = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($front) {
  $fpid = $front.OwningProcess
  try { $fproc = Get-Process -Id $fpid -ErrorAction SilentlyContinue } catch { $fproc = $null }
  Write-Output "Port 5173 owned by PID $fpid ($($fproc.ProcessName))"
  if ($back -and $back.OwningProcess -eq $fpid) {
    Write-Output "PID $fpid is the backend; will NOT stop it."
  } else {
    if ($fproc) {
      if ($fproc.ProcessName -eq 'node') {
        Write-Output "Stopping node PID $fpid to free 5173..."
        Stop-Process -Id $fpid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300
        Write-Output "Stopped PID $fpid"
      } else {
        Write-Output "Owner is not node ($($fproc.ProcessName)); skipping stop."
      }
    } else {
      Write-Output "Owner PID $fpid not found as a process object; skipping."
    }
  }
} else {
  Write-Output "No listener on 5173"
}

# Show current listeners for sanity
Get-NetTCPConnection -LocalPort 3002,5173,5174 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize
