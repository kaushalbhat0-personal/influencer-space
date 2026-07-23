import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Games – CRUD & Data Reflection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show games list", async ({ page }) => {
    await page.click('a:has-text("Games")');
    await page.waitForURL("/admin/games");
    await expect(page.locator("h1")).toContainText("Games");
  });

  test("should create + edit + delete a game with data reflecting after each step", async ({ page }) => {
    const createName = "GameCreate " + Date.now();
    const editName = "GameEdit " + Date.now();

    // CREATE
    await page.click('a:has-text("Games")');
    await page.waitForURL("/admin/games");
    await page.click('a:has-text("New Game")');
    await page.waitForURL("/admin/games/new");
    await page.fill('input[name="name"]', createName);
    await page.fill('input[name="genre"]', "Battle Royale");
    await page.click('button:has-text("Create Game")');
    await page.waitForURL("/admin/games");
    await expect(page.locator(`text=${createName}`)).toBeVisible({ timeout: 8000 });

    // EDIT
    await page.locator('a:has-text("Edit")').first().click();
    await page.waitForURL(/\/admin\/games\/.+\/edit/);
    await page.fill('input[name="name"]', editName);
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL("/admin/games");
    await expect(page.locator(`text=${editName}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${createName}`)).not.toBeVisible();

    // DELETE
    page.on("dialog", (d) => d.accept());
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${editName}`)).not.toBeVisible({ timeout: 8000 });
  });
});
