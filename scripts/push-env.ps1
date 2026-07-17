# Push all env vars from .env.local to Vercel production
# Run: .\scripts\push-env.ps1

$localFile = ".env.local"

$localVars = @{}
Get-Content $localFile | ForEach-Object {
  if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $key = $matches[1]
    $val = $matches[2]
    # Skip Vercel-injected vars that start with VERCEL_ (except our vars)
    if ($key -like "VERCEL_GIT_*" -or $key -like "VERCEL_OIDC_*" -or $key -like "TURBO_*" -or $key -eq "VERCEL" -or $key -eq "VERCEL_ENV" -or $key -eq "VERCEL_URL" -or $key -eq "VERCEL_TARGET_ENV" -or $key -eq "NX_DAEMON") {
      return
    }
    # Skip empty and placeholder values
    if ($val -eq '""' -or $val -eq '""' -or $val -eq "" -or $val -like "your-*") {
      Write-Host "SKIP $key (empty or placeholder)" -ForegroundColor Yellow
      return
    }
    $localVars[$key] = $val.Trim('"')
  }
}

Write-Host "=== Pushing $($localVars.Count) env vars to Vercel production ===" -ForegroundColor Cyan

foreach ($key in $localVars.Keys) {
  $val = $localVars[$key]
  Write-Host "  Adding $key ..." -ForegroundColor Gray -NoNewline
  $result = vercel env add $key production $val --force 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host " OK" -ForegroundColor Green
  } else {
    Write-Host " FAILED: $result" -ForegroundColor Red
  }
}

Write-Host "`nDone." -ForegroundColor Cyan
Write-Host "Run 'vercel --prod' to deploy with new env vars." -ForegroundColor Yellow
