import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show settings page", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("should update influencer profile", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    await page.fill('input[name="name"]', "Test Name");
    await page.fill('input[name="tagline"]', "Test Tagline");
    await page.fill('textarea[name="bio"]', "Test bio content for the profile.");

    await page.click('button:has-text("Save Profile")');
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({ timeout: 10000 });
  });
});
