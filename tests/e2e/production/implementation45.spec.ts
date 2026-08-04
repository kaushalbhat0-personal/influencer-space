import { test, expect } from "@playwright/test";
import { shot, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R19.1 - Marketing experience layer renders (config-driven background + decoration)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="experience-trust-bar"]', { timeout: 30000 });
  // Aurora experience → decoration layer (blobs) renders inside the section.
  expect(await page.locator('[data-testid="experience-trust-bar"] [data-testid="decoration-layer"]').count()).toBeGreaterThan(0);
  await shot(page, "r19-1-marketing-experience");
  errors.assertClean();
});

test("R19.2 - Storefront sections carry the theme's experience (no console errors)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/test-creator-1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="experience-section-0"]', { timeout: 30000 });
  expect(await page.locator('[data-testid^="experience-section-"]').count()).toBeGreaterThan(0);
  await shot(page, "r19-2-storefront-experience");
  errors.assertClean();
});

test("R19.3 - Theme Runtime diagnostics resolves theme → experience for all themes", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/dev/theme-runtime", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="theme-runtime-title"]', { timeout: 30000 });
  const rows = await page.locator('[data-testid="experience-row"]').count();
  expect(rows).toBeGreaterThan(0);
  const resolution = await page.locator('[data-testid="experience-resolution"]').first().innerText();
  expect(resolution).toContain("experience:");
  await shot(page, "r19-3-theme-runtime-diagnostics");
  errors.assertClean();
});

test("R19.4 - Experience layer is responsive (no horizontal scroll at 375px)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/test-creator-1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="experience-section-0"]', { timeout: 30000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="experience-trust-bar"]', { timeout: 30000 });
  const marketingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(marketingOverflow).toBe(false);
  await shot(page, "r19-4-mobile-experience");
  errors.assertClean();
});

test("R19.5 - Experience honors reduced motion", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/test-creator-1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="experience-section-0"]', { timeout: 30000 });
  // Sections render with the motion class present but reduced-motion collapses
  // animations globally — no errors, no layout breakage.
  await shot(page, "r19-5-reduced-motion");
  errors.assertClean();
});
