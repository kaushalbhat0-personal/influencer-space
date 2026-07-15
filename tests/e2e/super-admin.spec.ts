import { test, expect } from "@playwright/test";

test("Super Admin can log in and view dashboard", async ({ page }) => {
  await page.goto("http://localhost:3000/admin/login");

  await page.fill('input[type="email"]', "superadmin@INFS.com");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button:has-text("Sign in")');

  await expect(page).toHaveURL(/\/super-admin/, { timeout: 10000 });

  await expect(page.locator("text=Active Creators")).toBeVisible({ timeout: 5000 });
});
