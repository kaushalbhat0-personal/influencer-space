# Server Readiness Fix — IMPLEMENTATION-20 (Phase E)

## Problem

OpenCode hung "waiting for the dev server". The Next.js server printed "Ready
in 7.5s" but the waiting state never ended.

Two defects:

1. **Readiness was bound to terminal output** (waiting for stdout to print
   "Ready"), which is unreliable and blocked.
2. The spawn used `Start-Process -RedirectStandardOutput`, which makes
   PowerShell hold the child's stdout/stderr **pipe handles**. When PowerShell
   tried to exit, it blocked on those handles while the long-lived dev server
   kept running → the tool hung even though the server was up.

## The fix

### `scripts/wait-for-server.mjs` — HTTP polling, no stdout dependence

- Polls `/api/health` (dedicated health route) by default.
- **Ready = any HTTP response < 500** (200 / 302 / 307 / 401 / 403 / 404 all
  count). We never parse HTML and never wait for page content.
- Configurable timeout (default 120 s) and interval (default 1 s).
- Watches an optional `--pid`: if the spawned process exits early, it prints
  stdout/stderr and fails immediately.
- On timeout, prints the captured logs before failing.

### `scripts/dev-server.ps1` — detached spawn, no pipe-holding

- Stops whatever is bound to the port, then spawns the server via
  `cmd /c ""<next.cmd>" dev -p <port> > log 2> log"` using .NET
  `ProcessStartInfo` with `UseShellExecute = true`.
- `UseShellExecute = true` → **fully detached**: PowerShell holds no pipes and
  can exit the moment readiness is confirmed, while the server keeps running.
- Output redirection lives in the cmd.exe command line (the `> log 2> log`),
  not in PowerShell's `-RedirectStandardOutput`.
- The outer quote pair (`/c ""…" …""`) is required by `cmd.exe`'s parsing when
  the executable path contains spaces ("Youtube Content").

## Usage

```
powershell -ExecutionPolicy Bypass -File scripts/dev-server.ps1 -Port 3000
```

Prints `[wait-for-server] ready: http://localhost:3000/api/health -> HTTP 401`
and exits 0. On failure, prints logs and exits non-zero.

## Verified

- Server starts detached and reports ready via HTTP (401 < 500).
- PowerShell exits cleanly (exit 0) with the server still running.
- Second invocation restarts cleanly; early process exit is detected and logs
  are dumped.
- No reliance on terminal output, no fixed sleeps.
