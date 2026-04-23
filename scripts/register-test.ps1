$email = "cli_test_$((Get-Date -UFormat %s))@example.com"
$body = @{ name = 'CLI Tester'; email = $email; password = 'Password123!' } | ConvertTo-Json -Compress
Write-Output "Posting to /api/auth/register with email: $email"
try {
  $res = Invoke-RestMethod -Uri 'http://localhost:3002/api/auth/register' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
  $res | ConvertTo-Json -Compress | Write-Output
} catch {
  Write-Output "Request failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.Content | Write-Output }
}
