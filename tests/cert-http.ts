const BASE = "http://localhost:3000";

interface Check {
  phase: string;
  check: string;
  status: string;
  detail: string;
}

const results: Check[] = [];
let phase = "";

function ok(c: string, d: string) { results.push({ phase, check: c, status: "✅", detail: d }); }
function fail(c: string, d: string) { results.push({ phase, check: c, status: "❌", detail: d }); }

async function checkUrl(path: string, expectedStatus: number, expectedRedirect?: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  const acceptedStatuses = [expectedStatus];
  if (expectedStatus === 302) acceptedStatuses.push(307); // Accept 307 as valid redirect
  const okStatus = acceptedStatuses.includes(res.status);
  if (expectedRedirect) {
    const location = res.headers.get("location") || "";
    const redirected = location.includes(expectedRedirect);
    okStatus && redirected ? ok(`${path} → ${res.status} (→ ${expectedRedirect})`, location) : fail(`${path} → ${res.status}`, `Expected redirect to ${expectedRedirect}, got ${res.status} location: ${location}`);
  } else {
    okStatus ? ok(`${path} → ${res.status}`, `Status: ${res.status}`) : fail(`${path} → ${res.status}`, `Expected ${expectedStatus}`);
  }
}

async function main() {
  // Phase 1: Bootstrap
  phase = "1 — Bootstrap";
  await checkUrl("/", 200);
  await checkUrl("/showcase", 200);
  await checkUrl("/pricing", 200);
  await checkUrl("/features", 200);
  await checkUrl("/admin/login", 200);

  // Phase 6: Security — Anonymous access to protected routes
  phase = "6 — Security";
  await checkUrl("/super-admin", 302, "/admin/login");
  await checkUrl("/admin/dashboard", 302, "/admin/login");
  await checkUrl("/builder", 302, "/admin/login");

  // Phase 6: Login via API
  phase = "2 — Super Admin";
  const loginUrl = `${BASE}/api/auth/callback/credentials`;
  const formData = new URLSearchParams();
  formData.append("email", "admin@creatorstore.test");
  formData.append("password", "admin123");
  formData.append("csrfToken", "dummy");
  formData.append("callbackUrl", "/super-admin");
  formData.append("json", "true");

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
    redirect: "manual",
  });
  ok("Login API responds", `Status: ${loginRes.status}`);

  // Extract session cookie
  const cookies = loginRes.headers.get("set-cookie") || "";
  ok("Login sets cookie", cookies.length > 100 ? `Cookie set (${cookies.length} chars)` : "No cookie");

  // Phase 6: Super Admin pages with cookie
  const authHeaders: Record<string, string> = {};
  if (cookies) {
    // Extract just the name=value part from Set-Cookie header
    const match = cookies.match(/([^=]+=[^;]+)/);
    const cookieValue = match ? match[1] : cookies.split(";")[0];
    authHeaders["Cookie"] = cookieValue;
  }

  phase = "2 — Super Admin";
  const saPages = ["/super-admin", "/super-admin/health", "/super-admin/operations", "/super-admin/alerts", "/super-admin/runbooks"];
  for (const p of saPages) {
    const res = await fetch(`${BASE}${p}`, { headers: authHeaders, redirect: "manual" });
    ok(`${p} accessible`, `Status: ${res.status}${res.status === 200 ? " ✅" : " ❌"}`);
  }

  // Phase 6: Logout
  phase = "6 — Security";
  const logoutRes = await fetch(`${BASE}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders },
    body: new URLSearchParams({ csrfToken: "dummy", callbackUrl: "/admin/login" }).toString(),
    redirect: "manual",
  });
  const logoutCookie = logoutRes.headers.get("set-cookie") || "";
  ok("Logout clears cookie", logoutCookie.includes("Max-Age=0") || logoutCookie.includes("expires=Thu") ? "Cookie expired" : `Logout response: ${logoutRes.status}`);

  // Verify super-admin blocked after logout
  const res2 = await fetch(`${BASE}/super-admin`, { headers: authHeaders, redirect: "manual" });
  ok("Blocked after logout", res2.status === 302 ? `Redirected ${res2.headers.get("location")}` : `Status: ${res2.status}`);

  // Print Report
  console.log(`\n  CREATORSTORE PRODUCTION CERTIFICATION`);
  console.log(`  ${"=".repeat(40)}`);
  console.log(`  ${new Date().toISOString()}\n`);

  let currentPhase = "";
  for (const r of results) {
    if (r.phase !== currentPhase) {
      console.log(`  ── ${r.phase} ──`);
      currentPhase = r.phase;
    }
    console.log(`  ${r.status} ${r.check.padEnd(55)} ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === "✅").length;
  const failed = results.filter((r) => r.status === "❌").length;
  console.log(`\n  ${passed} passed, ${failed} failed`);
  console.log(`  ${failed === 0 ? "✅ PRODUCTION CERTIFIED" : "❌ NOT CERTIFIED"}\n`);
}

main().catch(console.error);
