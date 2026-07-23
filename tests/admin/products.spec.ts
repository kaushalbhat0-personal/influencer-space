import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Products – CRUD & Data Reflection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show products list", async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");
    await expect(page.locator("h1")).toContainText("Products");
  });

  test("should create + edit + delete a product with data reflecting after each step", async ({ page }) => {
    const createName = "CreateTest " + Date.now();
    const editName = "EditTest " + Date.now();

    // CREATE
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");
    await page.click('a:has-text("New Product")');
    await page.waitForURL("/admin/products/new");
    await page.fill('input[name="name"]', createName);
    await page.fill('input[name="price"]', "999");
    await page.click('button:has-text("Create Product")');
    await page.waitForURL("/admin/products");
    await expect(page.locator(`text=${createName}`)).toBeVisible({ timeout: 8000 });

    // EDIT
    await page.locator('a:has-text("Edit")').first().click();
    await page.waitForURL(/\/admin\/products\/.+\/edit/);
    await page.fill('input[name="name"]', editName);
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL("/admin/products");
    await expect(page.locator(`text=${editName}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${createName}`)).not.toBeVisible();

    // DELETE
    page.on("dialog", (d) => d.accept());
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${editName}`)).not.toBeVisible({ timeout: 8000 });
  });
});
