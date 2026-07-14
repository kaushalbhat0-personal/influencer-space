import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Games", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show games list", async ({ page }) => {
    await page.click('a:has-text("Games")');
    await page.waitForURL("/admin/games");
    await expect(page.locator("h1")).toContainText("Games");
  });

  test("should create a new game", async ({ page }) => {
    await page.click('a:has-text("Games")');
    await page.waitForURL("/admin/games");
    await page.click('a:has-text("New Game")');
    await page.waitForURL("/admin/games/new");

    await page.fill('input[name="name"]', "Test Game");
    await page.fill('textarea[name="description"]', "Test game description");

    await page.click('button:has-text("Create Game")');
    await page.waitForURL("/admin/games");
    await expect(page.locator("text=Test Game")).toBeVisible();
  });
});
