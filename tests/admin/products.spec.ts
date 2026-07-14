import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Products", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show products list", async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");
    await expect(page.locator("h1")).toContainText("Products");
  });

  test("should create a new product", async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");
    await page.click('a:has-text("New Product")');
    await page.waitForURL("/admin/products/new");

    await page.fill('input[name="name"]', "Test Product");
    await page.fill('input[name="price"]', "999");
    await page.fill('textarea[name="description"]', "Test description");

    await page.click('button:has-text("Create Product")');
    await page.waitForURL("/admin/products");

    await expect(page.locator("text=Test Product")).toBeVisible();
  });

  test("should edit a product", async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");

    const editBtn = page.locator('a:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForURL(/\/admin\/products\/.+\/edit/);
      await page.fill('input[name="name"]', "Edited Product");
      await page.click('button:has-text("Save Changes")');
      await page.waitForURL("/admin/products");
      await expect(page.locator("text=Edited Product")).toBeVisible();
    }
  });

  test("should delete a product", async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL("/admin/products");

    const deleteBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      page.on("dialog", (d) => d.accept());
      await deleteBtn.click();
    }
  });
});
