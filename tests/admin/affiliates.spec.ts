import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Affiliates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show affiliates list", async ({ page }) => {
    await page.click('a:has-text("Affiliates")');
    await page.waitForURL("/admin/affiliates");
    await expect(page.locator("h1")).toContainText("Affiliate Links");
  });

  test("should create a new affiliate", async ({ page }) => {
    await page.click('a:has-text("Affiliates")');
    await page.waitForURL("/admin/affiliates");
    await page.click('a:has-text("New Affiliate")');
    await page.waitForURL("/admin/affiliates/new");

    await page.fill('input[name="title"]', "Test Affiliate");
    await page.fill('input[name="url"]', "https://example.com/affiliate");

    await page.click('button:has-text("Create Affiliate")');
    await page.waitForURL("/admin/affiliates");
    await expect(page.locator("text=Test Affiliate")).toBeVisible();
  });
});
