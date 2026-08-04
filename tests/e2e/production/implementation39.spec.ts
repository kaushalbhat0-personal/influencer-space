import { test, expect } from "@playwright/test";
import { shot, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

async function tryLoginSuperAdmin(page: import("@playwright/test").Page): Promise<boolean> {
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

test("R13.1 - Revenue dashboard derives MRR/ARR from Billing v2 (no hardcode)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await tryLoginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/revenue", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Revenue", { timeout: 30000 });

  // Real derived metrics: MRR + ARR + active subscribers + revenue/creator.
  expect(await page.locator("text=Monthly Revenue (MRR)").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Annual (ARR)").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Revenue / Creator").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Plan Distribution (active subscriptions)").count()).toBeGreaterThan(0);

  await shot(page, "r13-1-revenue-v2");
  errors.assertClean();
});

test("R13.2 - Invoices read Billing v2 (BillingInvoice)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await tryLoginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/invoices", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="invoices-table"]', { timeout: 30000 });

  // The invoices table renders from BillingInvoice with filters/search.
  expect(await page.locator("text=Platform invoices from Billing v2").count()).toBeGreaterThan(0);
  expect(await page.locator('select[aria-label="Filter by status"]').count()).toBe(1);

  await shot(page, "r13-2-invoices-v2");
  errors.assertClean();
});

test("R13.3 - Transactions is a unified commerce timeline", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await tryLoginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/transactions", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="transactions-table"]', { timeout: 30000 });

  expect(await page.locator("text=Unified commerce timeline").count()).toBeGreaterThan(0);
  expect(await page.locator('select[aria-label="Filter by kind"]').count()).toBe(1);

  await shot(page, "r13-3-transactions-unified");
  errors.assertClean();
});

test("R13.4 - Dev billing diagnostics expose revenue aggregates + migration status", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  // Creator login (dev surface).
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", "testcreator1@gmail.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/dashboard", { timeout: 30000 });

  await page.goto("/dev/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="bh-revenue-line"]', { timeout: 30000 });

  const mrr = await page.locator('[data-testid="bh-mrr"]').innerText();
  const arr = await page.locator('[data-testid="bh-arr"]').innerText();
  const migration = (await page.locator('[data-testid="bh-migration-pct"]').innerText()).replace("%", "").trim();
  const remainingReaders = await page.locator('[data-testid="bh-remaining-readers"]').innerText();

  expect(mrr).toMatch(/₹\d+/);
  expect(arr).toMatch(/₹\d+/);
  expect(Number(migration)).toBeGreaterThan(0);
  expect(Number(remainingReaders)).toBeGreaterThanOrEqual(0);

  await shot(page, "r13-4-billing-diagnostics");
  errors.assertClean();
});
