param(
  [string]$Environment = "production"
)

$vercelFile = ".env.vercel"
$localFile  = ".env.local"

Write-Host "=== Vercel Env Sync ===" -ForegroundColor Cyan

# 1. Pull Vercel envs to a staging file (never overwrite .env.local directly)
Write-Host "Pulling $Environment envs to $vercelFile ..." -ForegroundColor Yellow
vercel env pull $vercelFile --environment $Environment

if (-not (Test-Path $vercelFile)) {
  Write-Host "FAILED: $vercelFile was not created by 'vercel env pull'" -ForegroundColor Red
  exit 1
}

# 2. If .env.local doesn't exist, just rename the staging file
if (-not (Test-Path $localFile)) {
  Rename-Item $vercelFile $localFile
  Write-Host "Created $localFile from Vercel (no local file existed)" -ForegroundColor Green
  exit 0
}

# 3. Parse both files
$vercelVars = @{}
Get-Content $vercelFile | ForEach-Object {
  if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $vercelVars[$matches[1]] = $matches[2]
  }
}

$localVars = @{}
Get-Content $localFile | ForEach-Object {
  if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $localVars[$matches[1]] = $matches[2]
  }
}

# 4. Add Vercel vars that are MISSING from local (never overwrite local values)
$added = 0
$skipped = 0
foreach ($key in $vercelVars.Keys) {
  if (-not $localVars.ContainsKey($key)) {
    $localVars[$key] = $vercelVars[$key]
    $added++
  } else {
    $skipped++
  }
}

# 5. Write back to .env.local (preserving all existing values)
$lines = $localVars.Keys | Sort-Object | ForEach-Object { "$_=$($localVars[$_])" }
$lines | Set-Content $localFile

Write-Host "Done. Added $added new vars from Vercel, kept $skipped existing local values." -ForegroundColor Green
Write-Host "[SAFE] $localFile was your source of truth — nothing overwritten." -ForegroundColor Cyan

# 6. Cleanup staging file
Remove-Item $vercelFile
