/**
 * Creator Admin Experience Screenshots — RCCF-PLAYWRIGHT-02
 *
 * Captures high-res screenshots of every creator admin page for marketing,
 * docs, and tutorials. Dark mode, consistent viewport.
 */
import { test, expect } from "../../fixtures/auth";
import path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/marketing-assets/screenshots/creator");
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const MOBILE = { width: 390, height: 844 };

async function capture(page: Parameters<typeof test>[1] extends (arg: infer T) => unknown ? T : never, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

test.describe("Creator — Screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test("Dashboard", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/dashboard");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "01-dashboard-desktop");
    await creatorPage.setViewportSize(TABLET);
    await capture(creatorPage, "01-dashboard-tablet");
    await creatorPage.setViewportSize(MOBILE);
    await creatorPage.goto("/admin/dashboard");
    await capture(creatorPage, "01-dashboard-mobile");
  });

  test("Products page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/products");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "02-products-desktop");
  });

  test("Services page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/services");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "03-services-desktop");
  });

  test("Courses page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/courses");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "04-courses-desktop");
  });

  test("Bookings page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/bookings");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "05-bookings-desktop");
  });

  test("Orders page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/orders");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "06-orders-desktop");
  });

  test("Analytics page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/analytics");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "07-analytics-desktop");
  });

  test("Billing page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/billing");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "08-billing-desktop");
  });

  test("Domain settings", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/settings/domain");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "09-domain-desktop");
  });

  test("Appearance / Theme settings", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/appearance");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "10-appearance-desktop");
  });

  test("Theme Marketplace", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/themes");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "11-marketplace-desktop");
    await creatorPage.setViewportSize(TABLET);
    await capture(creatorPage, "11-marketplace-tablet");
    await creatorPage.setViewportSize(MOBILE);
    await creatorPage.goto("/admin/themes");
    await capture(creatorPage, "11-marketplace-mobile");
  });

  test("Media Library", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/media");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "12-media-desktop");
  });

  test("SEO settings", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/seo");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "13-seo-desktop");
  });

  test("Testimonials page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/testimonials");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "14-testimonials-desktop");
  });

  test("Gallery page", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/gallery");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "15-gallery-desktop");
  });

  test("Settings / Hero", async ({ creatorPage }) => {
    await creatorPage.setViewportSize(DESKTOP);
    await creatorPage.goto("/admin/settings");
    await creatorPage.waitForLoadState("networkidle");
    await capture(creatorPage, "16-settings-desktop");
  });
});
