# Registers a test user, logs in (if needed), then creates an item using the returned token
$email = "cli_test_$((Get-Date -UFormat %s))@example.com"
$pwd = 'Password123!'
$regBody = @{ name = 'CLI Item Creator'; email = $email; password = $pwd } | ConvertTo-Json -Compress
Write-Output "Registering user: $email"
try {
  $reg = Invoke-RestMethod -Uri 'http://localhost:3002/api/auth/register' -Method Post -Body $regBody -ContentType 'application/json' -TimeoutSec 10
  Write-Output "Registration response:`n" ($reg | ConvertTo-Json -Compress)
  $token = $reg.token
} catch {
  Write-Output "Registration failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.Content | Write-Output }
  exit 1
}

if (-not $token) {
  # Try login
  Write-Output "No token returned from register; attempting login..."
  $loginBody = @{ email = $email; password = $pwd } | ConvertTo-Json -Compress
  try {
    $login = Invoke-RestMethod -Uri 'http://localhost:3002/api/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -TimeoutSec 10
    $token = $login.token
    Write-Output "Login response:`n" ($login | ConvertTo-Json -Compress)
  } catch {
    Write-Output "Login failed: $($_.Exception.Message)"
    if ($_.Exception.Response) { $_.Exception.Response.Content | Write-Output }
    exit 1
  }
}

Write-Output "Using token: $($token.Substring(0,20))..."
$itemBody = @{ stockName = 'CLI Test Item'; quantity = 1; price = 4.99; description = 'Created from automated CLI test'; city = 'CLI Town' } | ConvertTo-Json -Compress
try {
  $hdr = @{ Authorization = "Bearer $token" }
  $item = Invoke-RestMethod -Uri 'http://localhost:3002/api/items' -Method Post -Body $itemBody -ContentType 'application/json' -Headers $hdr -TimeoutSec 10
  Write-Output "Created item response:`n" ($item | ConvertTo-Json -Compress)
} catch {
  Write-Output "Create item failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $_.Exception.Response.Content | Write-Output }
  exit 1
}
