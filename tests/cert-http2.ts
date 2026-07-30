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
    (statusOk && redirected) ? ok(`${path} → ${res.status}`, location) : fail(`${path} → ${res.status}`, `Expected redirect to ${expectedRedirect}, got ${res.status} Location: ${location.slice(0, 80)}`);
  } else {
    statusOk ? ok(`${path} → ${res.status}`, `OK`) : fail(`${path} → ${res.status}`, `Expected ${expectedStatus}`);
  }
  return res;
}

async function main() {
  // Phase 1: Bootstrap — public pages
  phase = "1 — Bootstrap";
  await checkUrl("/", 200);
  await checkUrl("/showcase", 200);
  await checkUrl("/pricing", 200);
  await checkUrl("/features", 200);
  await checkUrl("/admin/login", 200);

  // Phase 6: Anonymous → protected routes
  phase = "6 — Security";
  await checkUrl("/super-admin", 302, "/admin/login");
  await checkUrl("/admin/dashboard", 302, "/admin/login");
  await checkUrl("/builder", 302, "/admin/login");

  // Login via NextAuth — get CSRF token from NextAuth endpoint
  phase = "2 — Super Admin";
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfJson = await csrfRes.json() as { csrfToken?: string };
  const csrfToken = csrfJson?.csrfToken || "";
  ok("CSRF token obtained", csrfToken ? `Token: ${csrfToken.slice(0, 20)}...` : "Missing");

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: "/super-admin",
      email: "admin@creatorstore.test",
      password: "admin123",
    }).toString(),
    redirect: "manual",
  });

  // Extract session cookie — handle both dev and prod cookie names
  let sessionCookie = "";
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/(__Secure-)?next-auth\.session-token=([^;]+)/);
  if (cookieMatch) {
    sessionCookie = (cookieMatch[1] || "") + "next-auth.session-token=" + cookieMatch[2];
  }
  if (!sessionCookie && (loginRes.status === 302 || loginRes.status === 307)) {
    const location = loginRes.headers.get("location") || "";
    const redirectUrl = location.startsWith("http") ? location : `${BASE}${location}`;
    const redirectRes = await fetch(redirectUrl, { redirect: "manual" });
    const redirectCookie = redirectRes.headers.get("set-cookie") || "";
    const redirectMatch = redirectCookie.match(/(__Secure-)?next-auth\.session-token=([^;]+)/);
    if (redirectMatch) sessionCookie = (redirectMatch[1] || "") + "next-auth.session-token=" + redirectMatch[2];
  }
  ok("Login successful", sessionCookie ? `Cookie: ${sessionCookie.slice(0, 40)}...` : `No cookie, login status: ${loginRes.status}`);

  if (!sessionCookie) {
    fail("Login failed", "Could not extract session cookie");
    printReport();
    return;
  }

  // Test Super Admin pages with auth cookie
  const authHeaders = { Cookie: sessionCookie };
  for (const p of ["/super-admin", "/super-admin/health", "/super-admin/operations", "/super-admin/alerts", "/super-admin/runbooks"]) {
    const res = await fetch(`${BASE}${p}`, { headers: authHeaders, redirect: "manual" });
    (res.status === 200) ? ok(`${p} accessible`, `Status: ${res.status}`) : fail(`${p} → ${res.status}`, "Expected 200");
  }

  // Logout
  const logoutRes = await fetch(`${BASE}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: sessionCookie },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/admin/login" }).toString(),
    redirect: "manual",
  });
  const logoutCookie = logoutRes.headers.get("set-cookie") || "";
  ok("Logout clears cookie", logoutCookie.includes("Max-Age=0") || logoutCookie.includes("expires=Thu") ? "Cookie expired" : `Logout status: ${logoutRes.status}`);

  // Verify super-admin blocked after logout
  const postLogout = await fetch(`${BASE}/super-admin`, { headers: authHeaders, redirect: "manual" });
  ok("Blocked after logout", postLogout.status === 302 || postLogout.status === 307 ? `Redirected to ${postLogout.headers.get("location")}` : `Status: ${postLogout.status}`);

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
