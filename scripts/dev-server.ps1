param(
    [int]$Port = 3000,
    [int]$TimeoutMs = 120000,
    [string]$LogDir = "$env:TEMP\opencode"
)

# IMPLEMENTATION-20 (Phase E): start the Next.js dev server DETACHED, then wait
# for it to be READY using HTTP polling (scripts/wait-for-server.mjs).
#
# Readiness = any HTTP response < 500 (200/302/307/401/403/404 all count) from
# /api/health. We never read terminal output, never sleep a fixed duration, and
# never parse HTML. On failure the wrapper prints stdout/stderr and the
# spawned process's PID is monitored so an early exit is detected immediately.
#
# The child is spawned with UseShellExecute=$true (fully detached — PowerShell
# holds NO output pipes), and stdout/stderr redirection is embedded in the
# cmd.exe command line itself (`> log 2> log`). PowerShell therefore exits
# cleanly the instant readiness is confirmed while the server keeps running.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/dev-server.ps1 -Port 3000
# Returns 0 when the server is ready, non-zero with printed logs on failure.

$ErrorActionPreference = "Stop"

# Stop anything already bound to the port.
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $listener.OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 1500
}

$logBase = Join-Path $LogDir "dev-server"
$stdout = "$logBase-out.log"
$stderr = "$logBase-err.log"
Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue

$root = Split-Path -Parent $PSScriptRoot
$nextCmd = Join-Path $root "node_modules\.bin\next.cmd"

# `cmd /c ""<next.cmd>" dev -p <port> > "<stdout>" 2> "<stderr>""`
# UseShellExecute=$true = fully detached: PowerShell holds no pipes and can exit.
# The outer quote pair around the whole command is required by cmd.exe's /c
# parsing when the executable path contains spaces.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = '/c ""' + $nextCmd + '" dev -p ' + $Port + ' > "' + $stdout + '" 2> "' + $stderr + '""'
$psi.WorkingDirectory = $root
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $true
$proc = [System.Diagnostics.Process]::Start($psi)

$probe = Join-Path $PSScriptRoot "wait-for-server.mjs"
& node $probe --url "http://localhost:$Port" --path "/api/health" --timeout $TimeoutMs --pid $proc.Id --stdout $stdout --stderr $stderr

$code = $LASTEXITCODE
if ($code -ne 0) {
    Write-Error "Dev server did not become ready. PID=$($proc.Id) (see logs above)."
}
exit $code
