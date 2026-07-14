import { test, expect } from "@playwright/test";
import path from "path";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show gallery list", async ({ page }) => {
    await page.click('a:has-text("Gallery")');
    await page.waitForURL("/admin/gallery");
    await expect(page.locator("h1")).toContainText("Gallery");
  });

  test("should create a new gallery image", async ({ page }) => {
    await page.click('a:has-text("Gallery")');
    await page.waitForURL("/admin/gallery");
    await page.click('a:has-text("New Image")');
    await page.waitForURL("/admin/gallery/new");

    await page.fill('input[name="title"]', "Test Gallery Image");
    await page.fill('textarea[name="description"]', "Test description");
    await page.selectOption("select", "tournament");

    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.resolve("tests/fixtures/test-image.jpg");
    await fileInput.setInputFiles(fixturePath);

    await page.waitForSelector("img[alt='Upload preview']", { timeout: 15000 });
    await page.click('button:has-text("Create Image")');
    await page.waitForURL("/admin/gallery");
    await expect(page.locator("text=Test Gallery Image")).toBeVisible();
  });

  test("should delete a gallery image", async ({ page }) => {
    await page.click('a:has-text("Gallery")');
    await page.waitForURL("/admin/gallery");

    const deleteBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      page.on("dialog", (d) => d.accept());
      await deleteBtn.click();
    }
  });
});
