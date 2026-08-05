/**
 * Public Storefront Screenshots — RCCF-PLAYWRIGHT-05
 *
 * Captures seeded demo storefront at different viewport sizes.
 * For dark-mode experiences: Minimal, Aurora, Creator, Cyber, Luxury, Executive.
 */
import { test } from "@playwright/test";
import path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/marketing-assets/screenshots/storefront");
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const MOBILE = { width: 390, height: 844 };

const STOREFRONT_URL = process.env.SEEDED_STOREFRONT_URL ?? "/snax";

test.describe("Storefront — Screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test("Seeded storefront — Desktop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: DESKTOP, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(STOREFRONT_URL);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-storefront-desktop.png`, fullPage: true });
    await context.close();
  });

  test("Seeded storefront — Tablet", async ({ browser }) => {
    const context = await browser.newContext({ viewport: TABLET, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(STOREFRONT_URL);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-storefront-tablet.png`, fullPage: true });
    await context.close();
  });

  test("Seeded storefront — Mobile", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(STOREFRONT_URL);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-storefront-mobile.png`, fullPage: true });
    await context.close();
  });

  test("Marketing homepage", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-homepage-desktop.png`, fullPage: true });
  });

  test("Pricing page", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-pricing-desktop.png`, fullPage: true });
  });
});

/**
 * Marketing Website Screenshots — RCCF-PLAYWRIGHT-06
 */
test.describe("Marketing — Screenshots", () => {
  const marketingDir = path.resolve(process.cwd(), "docs/marketing-assets/screenshots/marketing");

  test("Homepage — Desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${marketingDir}/01-homepage-desktop.png`, fullPage: true });
  });

  test("Homepage — Mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${marketingDir}/02-homepage-mobile.png`, fullPage: true });
  });

  test("Pricing — Desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${marketingDir}/03-pricing-desktop.png`, fullPage: true });
  });

  test("Features page (homepage sections)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${marketingDir}/04-features-desktop.png`, fullPage: true });
  });

  test("Contact/Support page", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/support");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${marketingDir}/05-support-desktop.png`, fullPage: true });
  });
});
