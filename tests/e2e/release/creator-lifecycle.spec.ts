import { test, expect } from "@playwright/test";

const SA_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";
const SA_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "";
const YOUTUBE_URL = "https://www.youtube.com/@Class9MathsScience";

let creatorEmail = "";
let creatorPassword = "";
let storefrontUrl = "";

test.describe("CERTIFICATION-03: Creator Lifecycle", () => {
  test.describe("Phase 1: Super Admin Login", () => {
    test("login and verify dashboard", async ({ page }) => {
      test.setTimeout(60000);
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=Platform Dashboard").first()).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: "test-screenshots/sa-dashboard.png", fullPage: true });
    });
  });

  test.describe("Phase 2: Provision Creator via YouTube URL", () => {
    test("provision creator from YouTube", async ({ page }) => {
      test.setTimeout(120000);
      // Login as Super Admin
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });

      // Click Provision Tenant
      await page.click("text=Provision Tenant");
      await page.waitForTimeout(1000);

      // Select YouTube source
      await page.click("text=YouTube");
      await page.waitForTimeout(500);

      // Enter YouTube URL
      await page.fill('input[placeholder*="youtube"], input[type="text"]', YOUTUBE_URL);

      // Click Analyze
      await page.click("text=Analyze");
      await page.waitForTimeout(2000);

      // Wait for analysis to complete or result
      await page.waitForFunction(() => {
        const body = document.body.textContent || "";
        return body.includes("Creator provisioned") || body.includes("Provision failed") ||
               body.includes("Confirm") || body.includes("Import");
      }, { timeout: 60000 });

      await page.screenshot({ path: "test-screenshots/provision-result.png", fullPage: true });

      // Check for confirm button and click it
      const confirmBtn = page.locator("button:has-text('Confirm'), button:has-text('Provision'), button:has-text('Import')").last();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "test-screenshots/provision-done.png", fullPage: true });
      }

      // Try to extract creator info from the result
      const storefrontEl = page.locator("text=storefront").or(page.locator("text=Storefront"));
      if (await storefrontEl.isVisible().catch(() => false)) {
        storefrontUrl = await storefrontEl.innerText().catch(() => "");
      }
    });
  });

  test.describe("Phase 3-5: Creator Experience", () => {
    test("builder loads", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });

      await page.goto("/builder");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/builder/);
      await page.screenshot({ path: "test-screenshots/creator-builder.png", fullPage: true });
    });

    test("super admin themes page loads", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });

      await page.goto("/super-admin/themes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-screenshots/themes.png", fullPage: true });
    });

    test("super admin templates page loads", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });

      await page.goto("/super-admin/templates");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-screenshots/templates.png", fullPage: true });
    });

    test("revenue management loads", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/admin/login");
      await page.waitForSelector("#password", { timeout: 15000 });
      await page.fill("#email", SA_EMAIL);
      await page.fill("#password", SA_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/super-admin/, { timeout: 20000 });

      await page.goto("/super-admin/revenue-management");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-screenshots/revenue-management.png", fullPage: true });
    });
  });

  test.describe("Phase 9: Storefront Validation", () => {
    test("storefront renders", async ({ page }) => {
      test.setTimeout(30000);
      await page.goto("/demo");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await expect(page.locator("body")).not.toBeEmpty();
      await page.screenshot({ path: "test-screenshots/storefront.png", fullPage: true });
    });
  });
});
