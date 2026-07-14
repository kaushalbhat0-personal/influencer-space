import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show timeline list", async ({ page }) => {
    await page.click('a:has-text("Timeline")');
    await page.waitForURL("/admin/timeline");
    await expect(page.locator("h1")).toContainText("Timeline");
  });

  test("should create a new timeline event", async ({ page }) => {
    await page.click('a:has-text("Timeline")');
    await page.waitForURL("/admin/timeline");
    await page.click('a:has-text("New Event")');
    await page.waitForURL("/admin/timeline/new");

    await page.fill('input[name="year"]', "2024");
    await page.fill('input[name="title"]', "Test Event");
    await page.fill('textarea[name="description"]', "Test description");
    await page.fill('input[name="stats"]', "Champion");

    await page.click('button:has-text("Create Event")');
    await page.waitForURL("/admin/timeline");
    await expect(page.locator("text=Test Event")).toBeVisible();
  });
});
