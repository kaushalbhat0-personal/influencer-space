import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Affiliates – CRUD & Data Reflection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show affiliates list", async ({ page }) => {
    await page.click('a:has-text("Affiliates")');
    await page.waitForURL("/admin/affiliates");
    await expect(page.locator("h1")).toContainText("Affiliate");
  });

  test("should create + edit + delete an affiliate with data reflecting after each step", async ({ page }) => {
    const createTitle = "AffCreate " + Date.now();
    const editTitle = "AffEdit " + Date.now();

    // CREATE
    await page.click('a:has-text("Affiliates")');
    await page.waitForURL("/admin/affiliates");
    await page.click('a:has-text("New Affiliate")');
    await page.waitForURL("/admin/affiliates/new");
    await page.fill('input[name="title"]', createTitle);
    await page.fill('input[name="url"]', "https://example.com/test");
    await page.click('button:has-text("Create Affiliate")');
    await page.waitForURL("/admin/affiliates");
    await expect(page.locator(`text=${createTitle}`)).toBeVisible({ timeout: 8000 });

    // EDIT
    await page.locator('a:has-text("Edit")').first().click();
    await page.waitForURL(/\/admin\/affiliates\/.+\/edit/);
    await page.fill('input[name="title"]', editTitle);
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL("/admin/affiliates");
    await expect(page.locator(`text=${editTitle}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${createTitle}`)).not.toBeVisible();

    // DELETE
    page.on("dialog", (d) => d.accept());
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${editTitle}`)).not.toBeVisible({ timeout: 8000 });
  });
});
