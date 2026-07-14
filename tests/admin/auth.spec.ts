import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("h1")).toContainText("Admin Login");
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button:has-text("Sign in")');
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });
});
