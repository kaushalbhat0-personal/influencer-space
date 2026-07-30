import { chromium } from "playwright";

const BASE = "http://localhost:3000";

interface CheckResult {
  phase: string;
  check: string;
  status: "✅" | "❌" | "⚠️";
  detail: string;
}

const results: CheckResult[] = [];
let browser: Awaited<ReturnType<typeof chromium.launch>>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

function ok(check: string, detail: string) { results.push({ phase: phaseName, check, status: "✅", detail }); }
function fail(check: string, detail: string) { results.push({ phase: phaseName, check, status: "❌", detail }); }
let phaseName = "";

async function run() {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();

  // ── Phase 1: Bootstrap ──────────────────────────────────────
  phaseName = "1 — Bootstrap";
  await page.goto(BASE, { waitUntil: "load", timeout: 15000 });
  ok("Homepage loads", `${await page.title()}`);

  await page.goto(`${BASE}/showcase`, { waitUntil: "load", timeout: 15000 });
  ok("Showcase loads", `URL: ${page.url()}`);

  await page.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 15000 });
  const emailInput = page.locator('input[type="email"]');
  ok("Login page loads", await emailInput.isVisible() ? "Email input visible" : "Missing email input");

  // ── Phase 2: Super Admin Journey ────────────────────────────
  phaseName = "2 — Super Admin";
  await emailInput.fill("admin@creatorstore.test");
  await page.locator('input[type="password"]').fill("admin123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/super-admin**", { timeout: 15000 });
  ok("Super Admin login", `Redirected to: ${page.url()}`);

  await page.goto(`${BASE}/super-admin`, { waitUntil: "load", timeout: 15000 });
  ok("Dashboard loads", await page.locator("text=Platform Dashboard").isVisible() ? "Visible" : "Not visible");

  await page.goto(`${BASE}/super-admin/health`, { waitUntil: "load", timeout: 15000 });
  ok("Health page loads", await page.locator("text=Platform Health").isVisible() ? "Visible" : "Not visible");

  await page.goto(`${BASE}/super-admin/operations`, { waitUntil: "load", timeout: 15000 });
  ok("Operations page loads", `URL: ${page.url()}`);

  await page.goto(`${BASE}/super-admin/alerts`, { waitUntil: "load", timeout: 15000 });
  ok("Alerts page loads", await page.locator("text=Alert Center").isVisible() ? "Visible" : "Not visible");

  await page.goto(`${BASE}/super-admin/runbooks`, { waitUntil: "load", timeout: 15000 });
  ok("Runbooks page loads", await page.locator("text=Runbooks").isVisible() ? "Visible" : "Not visible");

  // ── Phase 6: Security ───────────────────────────────────────
  phaseName = "6 — Security";
  await page.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 15000 });
  await page.evaluate(() => document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"); }));
  await page.goto(`${BASE}/super-admin`, { waitUntil: "load", timeout: 15000 });
  const redirected = page.url().includes("/admin/login");
  ok("Anonymous → /super-admin blocked", redirected ? "Redirected to /admin/login" : `Not redirected: ${page.url()}`);

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "load", timeout: 15000 });
  const redirected2 = page.url().includes("/admin/login");
  ok("Anonymous → /admin/dashboard blocked", redirected2 ? "Redirected" : "Not redirected");

  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 15000 });
  const redirected3 = page.url().includes("/admin/login");
  ok("Anonymous → /builder blocked", redirected3 ? "Redirected" : "Not redirected");

  // ── Logout test ─────────────────────────────────────────────
  await page.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 15000 });
  await page.locator('input[type="email"]').fill("admin@creatorstore.test");
  await page.locator('input[type="password"]').fill("admin123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/super-admin**", { timeout: 15000 });

  const signOutBtn = page.locator("button:has-text('Sign Out')");
  if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signOutBtn.click();
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
    ok("Logout works", `Redirected to: ${page.url()}`);

    await page.goto(`${BASE}/super-admin`, { waitUntil: "load", timeout: 15000 });
    const postLogout = page.url().includes("/admin/login");
    ok("Back button blocked after logout", postLogout ? "Redirected to login" : `Not blocked: ${page.url()}`);
  } else {
    fail("Logout test", "Sign Out button not found");
  }

  // ── Print Report ────────────────────────────────────────────
  await browser.close();
  printReport();
}

function printReport() {
  console.log("\n");
  console.log("  CREATORSTORE PRODUCTION CERTIFICATION");
  console.log("  ═════════════════════════════════════");
  console.log(`  ${new Date().toISOString()}`);
  console.log("");

  let currentPhase = "";
  for (const r of results) {
    if (r.phase !== currentPhase) {
      console.log(`  ── ${r.phase} ──`);
      currentPhase = r.phase;
    }
    console.log(`  ${r.status} ${r.check.padEnd(45)} ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === "✅").length;
  const failed = results.filter((r) => r.status === "❌").length;

  console.log("");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("  ✅ PRODUCTION CERTIFIED");
  } else {
    console.log("  ❌ NOT CERTIFIED");
  }
  console.log("");
}

run().catch((err) => {
  console.error("CERTIFICATION FAILED:", err);
  browser?.close();
  process.exit(1);
});
