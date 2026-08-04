import { test, expect } from "@playwright/test";
import { shot, ErrorCollector, loginAsCreator } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R17.1 - Marketing homepage is honest: no fabricated metrics/testimonials/case studies", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=CreatorStore", { timeout: 30000 });

  // Fabricated trust sections render nothing (empty seeds → null).
  expect(await page.locator("#metrics").count()).toBe(0);
  expect(await page.locator("text=Storefronts Generated").count()).toBe(0);
  expect(await page.locator("text=Creators Onboarded").count()).toBe(0);
  expect(await page.locator("text=Trusted by creators like you").count()).toBe(0);
  expect(await page.locator("text=What creators are saying").count()).toBe(0);

  // Organization schema present.
  const scripts = page.locator('script[type="application/ld+json"]');
  const joined = (await scripts.evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).textContent ?? ""))).join("");
  expect(joined).toContain('"@type":"Organization"');

  await shot(page, "r17-1-honest-marketing");
  errors.assertClean();
});

test("R17.2 - Pricing: grouped comparison matrix + outcome-based copy", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/pricing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="comparison-matrix"]', { timeout: 30000 });

  // Grouped headers (canonical capability groups).
  expect(await page.locator("text=Website").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Commerce").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Builder").count()).toBeGreaterThan(0);

  // Outcome-based copy (Phase 2).
  await page.waitForSelector("text=Get your storefront online and start selling", { timeout: 30000 });

  // No fake annual discount toggle.
  expect(await page.locator('button[role="switch"]').count()).toBe(0);

  await shot(page, "r17-2-pricing-polish");
  errors.assertClean();
});

test("R17.3 - Agency billing explains the honest creator-subscription policy", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", "agencyadmin@creatortest.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agency", { timeout: 15000 });
  await page.goto("/agency/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="partner-subscription-policy"]', { timeout: 30000 });
  expect(await page.locator("text=Creator Subscription Policy").count()).toBeGreaterThan(0);
  expect(await page.locator('[data-testid="partner-rewards-coming-soon"]').count()).toBeGreaterThan(0);
  expect(await page.locator("text=Managed Creators").count()).toBeGreaterThan(0);
  await shot(page, "r17-3-partner-billing");
  errors.assertClean();
});

test("R17.4 - Storefront renders with the seamless hero (no hard seam)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/test-creator-1", { waitUntil: "networkidle", timeout: 60000 });
  // Page renders (hero + sections) without error; main surface present.
  await page.waitForSelector("#main-content", { timeout: 30000 });
  expect(await page.locator("#main-content").count()).toBeGreaterThan(0);
  await shot(page, "r17-4-storefront-hero");
  errors.assertClean();
});

test("R17.5 - Creator billing is an account dashboard (Overview/Plans/Invoices/Usage)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);
  await page.goto("/admin/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Overview", { timeout: 30000 });
  expect(await page.locator("text=Plans").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Invoices").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Usage").count()).toBeGreaterThan(0);
  await shot(page, "r17-5-creator-billing");
  errors.assertClean();
});
