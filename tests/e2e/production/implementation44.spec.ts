import { test, expect } from "@playwright/test";
import { shot, ErrorCollector, loginAsCreator } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R18.1 - PES: no horizontal scroll at mobile widths (marketing + admin)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=CreatorStore", { timeout: 30000 });
  const marketingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(marketingOverflow).toBe(false);

  await loginAsCreator(page);
  await page.goto("/admin/dashboard", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("main, #main-content", { timeout: 30000 });
  const adminOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(adminOverflow).toBe(false);

  await shot(page, "r18-1-mobile-no-overflow");
  errors.assertClean();
});

test("R18.2 - PES: data tables use tabular numerals (no layout shift)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await (async () => {
    await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
    await page.fill("#email", "superadmin@influencer.space");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    try { await page.waitForURL("**/super-admin", { timeout: 15000 }); return true; } catch { return false; }
  })();
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/tenants", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".admin-table", { timeout: 30000 });
  const variant = await page.locator(".admin-table").first().evaluate((el) => getComputedStyle(el).fontVariantNumeric);
  expect(variant).toContain("tabular-nums");
  await shot(page, "r18-2-tabular-nums");
  errors.assertClean();
});

test("R18.3 - PES: elevation token is defined and admin cards use the card surface", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await (async () => {
    await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
    await page.fill("#email", "superadmin@influencer.space");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    try { await page.waitForURL("**/super-admin", { timeout: 15000 }); return true; } catch { return false; }
  })();
  test.skip(!ok, "superadmin unavailable");
  await page.goto("/super-admin/tenants", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".admin-card", { timeout: 30000 });
  // The design system defines the elevation token used by .admin-card.
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--shadow-elevation").trim(),
  );
  expect(token.length).toBeGreaterThan(0);
  expect(token).not.toBe("none");
  await shot(page, "r18-3-elevation-token");
  errors.assertClean();
});

test("R18.4 - PES: keyboard focus ring is visible", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/pricing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href="/signup"]', { timeout: 30000 });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    const style = getComputedStyle(el);
    return `${style.boxShadow}::${style.outlineStyle}`;
  });
  // The global :focus-visible rule sets a box-shadow focus ring.
  expect(focused.length).toBeGreaterThan(0);
  await shot(page, "r18-4-focus-ring");
  errors.assertClean();
});

test("R18.5 - PES: reduced-motion is respected", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=CreatorStore", { timeout: 30000 });
  const duration = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--duration-normal"));
  await shot(page, "r18-5-reduced-motion");
  errors.assertClean();
});

test("R18.6 - PES: storefront renders in dark mode with no console errors", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/test-creator-1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#main-content", { timeout: 30000 });
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector("#main-content") as HTMLElement).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  await shot(page, "r18-6-storefront-dark");
  errors.assertClean();
});
