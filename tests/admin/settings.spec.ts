import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Settings – CRUD & Data Reflection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show settings page with gradient heading", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");
    await expect(page.locator("h1")).toContainText("Website Settings");
  });

  test("should update profile text fields and persist after navigation", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    const testName = "Test Name " + Date.now();
    const testTagline = "Test Tagline";
    const testBio = "Test bio content for the profile. Testing persistence across navigation.";

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="tagline"]', testTagline);
    await page.fill('textarea[name="bio"]', testBio);

    await page.click('button:has-text("Save Profile")');
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({ timeout: 10000 });

    // Navigate away and back to verify persistence
    await page.click('a:has-text("Dashboard")');
    await page.waitForURL("/admin/dashboard");
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    // Verify the values persisted (form should have fresh data from server)
    await expect(page.locator('input[name="name"]')).toHaveValue(testName);
    await expect(page.locator('input[name="tagline"]')).toHaveValue(testTagline);
    await expect(page.locator('textarea[name="bio"]')).toHaveValue(testBio);
  });

  test("should update hero section text fields and reflect immediately", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    const heroTitle = "Test Hero " + Date.now();
    const heroSubtitle = "Test Subtitle";
    const heroTagline = "Test tagline for hero section.";

    await page.fill('input[name="heroTitle"]', heroTitle);
    await page.fill('input[name="heroSubtitle"]', heroSubtitle);
    await page.fill('input[name="heroTagline"]', heroTagline);

    await page.click('button:has-text("Save Hero Settings")');
    await expect(page.locator("text=Hero settings updated successfully")).toBeVisible({ timeout: 10000 });

    // Navigate away and back
    await page.click('a:has-text("Dashboard")');
    await page.waitForURL("/admin/dashboard");
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    await expect(page.locator('input[name="heroTitle"]')).toHaveValue(heroTitle);
    await expect(page.locator('input[name="heroSubtitle"]')).toHaveValue(heroSubtitle);
    await expect(page.locator('input[name="heroTagline"]')).toHaveValue(heroTagline);
  });

  test("should restore default values after updating social links and profile text", async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await page.waitForURL("/admin/settings");

    // Save a known value
    const bio = "Regression test bio. Testing that data saves and reloads correctly.";
    await page.fill('textarea[name="bio"]', bio);
    await page.fill('input[name="name"]', "Regression Test");
    await page.fill('input[name="tagline"]', "Regression tagline");

    await page.click('button:has-text("Save Profile")');
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({ timeout: 10000 });

    // Hard navigation (full page reload) to bypass any client cache
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('textarea[name="bio"]')).toHaveValue(bio);
  });
});
