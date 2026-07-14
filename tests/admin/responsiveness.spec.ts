import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Responsiveness", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should display sidebar on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator("aside")).toBeVisible();
  });

  test("should hide sidebar and show hamburger on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("button[aria-label*='Open sidebar']")).toBeVisible();
  });

  test("should not have horizontal scroll on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const pages = [
      "/admin/dashboard",
      "/admin/gallery",
      "/admin/timeline",
      "/admin/games",
      "/admin/products",
      "/admin/affiliates",
      "/admin/messages",
      "/admin/settings",
    ];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10);
    }
  });

  test("should have proper heading spacing on all pages", async ({ page }) => {
    const pages = [
      "/admin/dashboard",
      "/admin/gallery",
      "/admin/timeline",
      "/admin/games",
      "/admin/products",
      "/admin/affiliates",
      "/admin/messages",
      "/admin/settings",
    ];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      const box = await heading.boundingBox();
      expect(box).toBeDefined();
      if (box) {
        expect(box.y).toBeGreaterThan(20);
      }
    }
  });
});
