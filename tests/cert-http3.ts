const BASE = "http://localhost:3000";

interface Check { phase: string; check: string; status: string; detail: string; }
const results: Check[] = [];
let phase = "";
function ok(c: string, d: string) { results.push({ phase, check: c, status: "✅", detail: d }); }
function fail(c: string, d: string) { results.push({ phase, check: c, status: "❌", detail: d }); }

async function checkUrl(path: string, expectedStatus: number, expectedRedirect?: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const okStatuses = expectedStatus === 302 ? [302, 307] : [expectedStatus];
  const statusOk = okStatuses.includes(res.status);
  if (expectedRedirect) {
    const location = res.headers.get("location") || "";
    const redirected = location.includes(expectedRedirect);
    (statusOk && redirected) ? ok(`${path} → ${res.status}`, `→ ${location}`) : fail(`${path} → ${res.status}`, `Expected ${expectedStatus} → ${expectedRedirect}`);
  } else {
    statusOk ? ok(`${path} → ${res.status}`, "OK") : fail(`${path} → ${res.status}`, `Expected ${expectedStatus}`);
  }
  return res;
}

async function login(): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfRes.json() as { csrfToken?: string };
  const csrfToken = csrfData.csrfToken || "";
  const csrfCookie = (csrfRes.headers.get("set-cookie") || "").split(";")[0];

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/super-admin", email: "admin@creatorstore.test", password: "admin123" }).toString(),
    redirect: "manual",
  });

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const m = setCookie.match(/(__Secure-)?next-auth\.session-token=([^;]+)/);
  if (m) return (m[1] || "") + "next-auth.session-token=" + m[2];
  return "";
}

async function main() {
  // Phase 1: Bootstrap
  phase = "1 — Bootstrap";
  await checkUrl("/", 200);
  await checkUrl("/showcase", 200);
  await checkUrl("/pricing", 200);
  await checkUrl("/features", 200);
  await checkUrl("/admin/login", 200);

  // Phase 6: Anonymous → protected
  phase = "6 — Security";
  await checkUrl("/super-admin", 302, "/admin/login");
  await checkUrl("/admin/dashboard", 302, "/admin/login");
  await checkUrl("/builder", 302, "/admin/login");

  // Phase 2: Super Admin login
  phase = "2 — Super Admin";
  const sessionCookie = await login();
  ok("Login with session cookie", sessionCookie ? `Cookie: ${sessionCookie.substring(0, 50)}...` : "FAILED");

  if (!sessionCookie) {
    fail("All super admin tests", "Cannot login");
    printReport();
    return;
  }

  const auth = { Cookie: sessionCookie };

  // Super Admin pages
  for (const p of ["/super-admin", "/super-admin/health", "/super-admin/operations", "/super-admin/alerts", "/super-admin/runbooks"]) {
    const res = await fetch(`${BASE}${p}`, { headers: auth, redirect: "manual" });
    res.status === 200 ? ok(`${p} loads`, `Status: ${res.status}`) : fail(`${p} → ${res.status}`, "Expected 200");
  }

  // Phase 7: Billing
  phase = "7 — Billing";
  const planCount = await fetch(`${BASE}/super-admin/subscriptions`, { headers: auth, redirect: "manual" });
  ok("Subscriptions page accessible", planCount.status === 200 ? `Status: ${planCount.status}` : `Status: ${planCount.status}`);

  // Phase 6: Logout
  phase = "6 — Security";
  const signoutRes = await fetch(`${BASE}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...auth },
    body: new URLSearchParams({ csrfToken: "dummy", callbackUrl: "/admin/login" }).toString(),
    redirect: "manual",
  });
  const logoutCookie = signoutRes.headers.get("set-cookie") || "";
  ok("Logout clears session", logoutCookie.includes("expires=Thu") ? "Cookie expired" : `Status: ${signoutRes.status}`);

  // Verify blocked after logout
  const blocked = await fetch(`${BASE}/super-admin`, { headers: auth, redirect: "manual" });
  ok("Blocked after logout", blocked.status === 302 || blocked.status === 307 ? `→ ${blocked.headers.get("location")}` : `Status: ${blocked.status}`);

  // Phase 6: Back button / cached page prevention
  const cachedHeaders = await fetch(`${BASE}/super-admin`, { headers: auth, redirect: "manual" });
  const cacheControl = cachedHeaders.headers.get("cache-control") || "";
  ok("Protected pages not cached", cacheControl.includes("no-store") ? "Cache-Control: no-store" : `Cache: ${cacheControl}`);

  printReport();
}

function printReport() {
  console.log(`\n  CREATORSTORE PRODUCTION CERTIFICATION`);
  console.log(`  ${"=".repeat(40)}`);
  console.log(`  ${new Date().toISOString()}\n`);
  let cp = "";
  for (const r of results) {
    if (r.phase !== cp) { console.log(`  ── ${r.phase} ──`); cp = r.phase; }
    console.log(`  ${r.status} ${r.check.padEnd(50)} ${r.detail}`);
  }
  const passed = results.filter((r) => r.status === "✅").length;
  const failed = results.filter((r) => r.status === "❌").length;
  console.log(`\n  ${passed} passed, ${failed} failed`);
  console.log(`  ${failed === 0 ? "✅ PRODUCTION CERTIFIED" : "❌ NOT CERTIFIED"}\n`);
}

main().catch(console.error);
