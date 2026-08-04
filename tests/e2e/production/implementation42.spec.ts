import { test, expect } from "@playwright/test";
import { shot, ErrorCollector } from "./helpers";

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

test("R16.1 - Marketing pricing renders canonical creator + partner plans", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/pricing", { waitUntil: "networkidle", timeout: 60000 });

  // Creator plans (canonical codes, real prices).
  await page.waitForSelector("text=Creator Launch", { timeout: 30000 });
  expect(await page.locator("text=Creator Grow").count()).toBeGreaterThan(0);
  expect(await page.locator("text=₹699").count()).toBeGreaterThan(0);
  expect(await page.locator("text=₹1,995").count()).toBeGreaterThan(0);

  // Partner tab → canonical partner plans + partner-rules note.
  await page.click("text=For Partners");
  await page.waitForSelector("text=Solo Partner", { timeout: 30000 });
  expect(await page.locator("text=Partner Growth").count()).toBeGreaterThan(0);
  expect(await page.locator("text=₹1,499").count()).toBeGreaterThan(0);
  expect(await page.locator("text=How Partner plans work").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Partner Enterprise").count()).toBeGreaterThan(0);

  // No fake annual discount toggle (IMPLEMENTATION-42 honesty).
  expect(await page.locator('button[role="switch"]').count()).toBe(0);
  expect(await page.locator("text=Save ~17%").count()).toBe(0);

  await shot(page, "r16-1-marketing-pricing");
  errors.assertClean();
});

test("R16.2 - Pricing page ships honest JSON-LD (Pricing + FAQ schema)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/pricing", { waitUntil: "networkidle", timeout: 60000 });
  const scripts = page.locator('script[type="application/ld+json"]');
  await scripts.first().waitFor({ state: "attached", timeout: 30000 });
  const count = await scripts.count();
  expect(count).toBeGreaterThan(0);
  const joined = (await scripts.evaluateAll((els) =>
    els.map((e) => (e as HTMLScriptElement).textContent ?? ""),
  )).join("");
  expect(joined).toContain("schema.org");
  expect(joined).toContain("FAQPage");
  await shot(page, "r16-2-pricing-seo");
  errors.assertClean();
});

test("R16.3 - Dev billing exposes partner restriction + plan origin diagnostics", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", "testcreator1@gmail.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/dashboard", { timeout: 30000 });
  await page.goto("/dev/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="bh-partner-restriction"]', { timeout: 30000 });
  await shot(page, "r16-3-billing-diagnostics");
  errors.assertClean();
});

test("R16.4 - Super Admin tenant detail shows partner-managed + restriction state", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/tenants", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=R15 Seed Creator", { timeout: 30000 });
  await page.click("text=R15 Seed Creator");
  await page.waitForSelector('[data-testid="tenant-partner-managed"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="tenant-partner-managed"]').innerText()).toBe("true");
  expect(await page.locator('[data-testid="tenant-restriction-state"]').count()).toBeGreaterThan(0);
  await shot(page, "r16-4-superadmin-restriction");
  errors.assertClean();
});

test("R16.5 - Super Admin subscriptions still aligned to canonical plans", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginSuperAdmin(page);
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/subscriptions", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="subscriptions-table"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="subscriptions-table"]').count()).toBeGreaterThan(0);
  await shot(page, "r16-5-superadmin-subscriptions");
  errors.assertClean();
});
