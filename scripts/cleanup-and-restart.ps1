$root = 'C:\Users\hp\Desktop\market place'
$ports = @(3002,5000,5173,5174,5175,5176)
foreach($p in $ports){
  $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
  if($conns){
    foreach($c in $conns){
      $ownPid = $c.OwningProcess
      $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
      if($proc){
        Write-Output "Port $p -> PID $ownPid ($($proc.ProcessName))"
        if($proc.ProcessName -eq 'node'){
          try{ Stop-Process -Id $ownPid -Force -ErrorAction Stop; Write-Output "Stopped node PID $ownPid" } catch { Write-Output "Failed to stop PID $ownPid" }
        } else {
          Write-Output "Skipping PID $ownPid (not node)"
        }
      } else {
        Write-Output "PID $ownPid not found"
      }
    }
  } else {
    Write-Output "Port $p not in use"
  }
}
Write-Output "Starting backend..."
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory (Join-Path $root 'backend') -NoNewWindow
Start-Sleep -Seconds 1
Write-Output "Starting frontend (vite on port 5173)..."
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npx vite --port 5173' -WorkingDirectory (Join-Path $root 'frontend') -NoNewWindow
Write-Output "Done."