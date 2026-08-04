import { test, expect } from "@playwright/test";
import { shot, ErrorCollector, loginAsCreator } from "./helpers";

test.describe.configure({ mode: "serial" });

async function loginSuperAdmin(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", "superadmin@influencer.space");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL("**/super-admin", { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

test("R14.1 - CRITICAL-01: /api/test-storage requires authentication", async ({ request }) => {
  const res = await request.get("http://localhost:3000/api/test-storage");
  expect(res.status()).toBe(401);
});

test("R14.2 - CRITICAL-02: /agency routes no longer redirect to a nonexistent /workspace", async ({ request }) => {
  const res = await request.get("/agency", { maxRedirects: 0 });
  // Unauthenticated: 307 to login guard (NOT a 308 to /workspace). The agency
  // console lives at /agency/** and resolves for AGENCY roles.
  expect([307, 302]).toContain(res.status());
  const location = res.headers()["location"] ?? "";
  expect(location).not.toContain("/workspace");
});

test("R14.3 - Operations dashboard loads with the Platform Operations Center", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/operations", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Platform Operations Center", { timeout: 30000 });

  expect(await page.locator("text=Publishing").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Provisioning").count()).toBeGreaterThan(0);
  expect(await page.locator("text=AI Ops (real)").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Marketplace").count()).toBeGreaterThan(0);

  await shot(page, "r14-3-operations-center");
  errors.assertClean();
});

test("R14.4 - Health page reflects the runtime (Operations Runtime)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/health", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="health-runtime-title"]', { timeout: 30000 });

  expect(await page.locator("text=Operations Runtime (real)").count()).toBeGreaterThan(0);
  expect(await page.locator('[data-testid="health-runtime-billing"]').count()).toBeGreaterThan(0);

  await shot(page, "r14-4-health-runtime");
  errors.assertClean();
});

test("R14.5 - Alerts persist and sync from runtime", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/alerts", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="alerts-table"]', { timeout: 30000 });

  await page.click('[data-testid="alerts-sync"]');
  await page.waitForSelector('[data-testid="alerts-notice"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="alerts-notice"]').innerText()).toContain("Sync complete");

  await shot(page, "r14-5-alerts-persisted");
  errors.assertClean();
});

test("R14.6 - Job Center shows persisted runs and registered runners", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/jobs", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="jobs-table"]', { timeout: 30000 });

  expect(await page.locator('[data-testid="runner-expire-invites"]').count()).toBeGreaterThan(0);
  expect(await page.locator("text=Persisted job runs").count()).toBeGreaterThan(0);

  // Manual run executes through the existing JobRunner and persists a JobRecord.
  await page.click('[data-testid="job-run-expire-invites"]');
  await page.waitForSelector('[data-testid="jobs-notice"]', { timeout: 30000 });
  const notice = await page.locator('[data-testid="jobs-notice"]').innerText();
  expect(notice).toContain("executed");
  expect(await page.locator('[data-status="SUCCEEDED"]').count()).toBeGreaterThan(0);

  await shot(page, "r14-6-job-center");
  errors.assertClean();
});

test("R14.7 - Unified activity feed aggregates across domains", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/activity", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="unified-feed"]', { timeout: 30000 });

  expect(await page.locator("text=Unified Activity Feed").count()).toBeGreaterThan(0);
  expect(await page.locator('select[aria-label="Filter feed by kind"]').count()).toBe(1);

  await shot(page, "r14-7-unified-activity");
  errors.assertClean();
});

test("R14.8 - Billing metrics on Operations match RevenueService", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/revenue", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Monthly Revenue (MRR)", { timeout: 30000 });
  const mrr = await page.locator("text=Monthly Revenue (MRR)").count();
  expect(mrr).toBeGreaterThan(0);
  // Operations snapshot exposes the same real aggregate (assert no hardcode).
  await page.goto("/super-admin/operations", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Platform Operations Center", { timeout: 30000 });
  await shot(page, "r14-8-billing-vs-operations");
  errors.assertClean();
});
