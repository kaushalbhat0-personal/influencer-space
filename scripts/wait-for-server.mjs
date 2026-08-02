#!/usr/bin/env node
/**
 * HTTP-polling server readiness probe — IMPLEMENTATION-20 (Phase E).
 *
 * Determines that the dev server is UP by polling a lightweight endpoint.
 *
 * Readiness rule (per spec): ANY HTTP response with status < 500 means the
 * server is up and accepting requests — 200, 302, 307, 401, 403 and 404 all
 * count. We never parse HTML and never wait for page content. The server is
 * "ready" when it responds at all, not when a specific route returns 200.
 *
 * Endpoint: uses the dedicated `/api/health` route by default (returns 401
 * without the health secret — 401 < 500 → ready). Fall back to the page URL
 * with `--page` if the health route is unavailable.
 *
 * Usage:
 *   node scripts/wait-for-server.mjs [options]
 *
 *   --url <url>        base url, default http://localhost:3000
 *   --path <path>      readiness path, default /api/health
 *   --timeout <ms>     default 120000
 *   --interval <ms>    default 1000
 *   --pid <pid>        watch a spawned process; if it dies early, print logs + fail
 *   --stdout <file>    log file printed on early-exit / timeout
 *   --stderr <file>    log file printed on early-exit / timeout
 *
 * Exit 0 when ready, 1 on timeout / early process exit.
 */
function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const baseUrl = arg("--url", "http://localhost:3000").replace(/\/$/, "");
const path = arg("--path", "/api/health");
const timeoutMs = Number(arg("--timeout", "120000"));
const intervalMs = Number(arg("--interval", "1000"));
const pid = Number(arg("--pid", "0")) || null;
const stdoutLog = arg("--stdout", "");
const stderrLog = arg("--stderr", "");
const url = `${baseUrl}${path}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probe() {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(url, { method: "GET", redirect: "follow", signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res.status);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function processAlive(p) {
  try {
    process.kill(p, 0);
    return true;
  } catch {
    return false;
  }
}

function printLogs(prefix) {
  for (const f of [stdoutLog, stderrLog]) {
    if (!f) continue;
    try {
      const fs = require("fs");
      const text = fs.readFileSync(f, "utf8").trim();
      if (text) console.error(`[wait-for-server] ${prefix} ${f}:\n${text.slice(-3000)}`);
    } catch {
      /* log file unreadable */
    }
  }
}

async function main() {
  const started = Date.now();
  let attempts = 0;

  while (Date.now() - started < timeoutMs) {
    attempts++;

    // If the spawned dev-server process exited early, this will never recover.
    if (pid && !processAlive(pid)) {
      console.error(`[wait-for-server] process ${pid} exited before the server became ready (${attempts} attempts).`);
      printLogs("process exited —");
      return 1;
    }

    const status = await probe();
    if (status !== null && status < 500) {
      console.log(
        `[wait-for-server] ready: ${url} -> HTTP ${status} after ${Date.now() - started}ms (${attempts} attempt(s))`,
      );
      return 0;
    }
    if (status !== null) {
      console.log(`[wait-for-server] ${url} -> HTTP ${status} (not <500); retrying`);
    }
    await sleep(intervalMs);
  }

  console.error(`[wait-for-server] TIMEOUT after ${timeoutMs}ms: ${url} never responded with HTTP < 500`);
  printLogs("timeout —");
  return 1;
}

main().then((code) => {
  process.exitCode = code;
});
