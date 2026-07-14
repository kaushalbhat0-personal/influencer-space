import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  const pages = [
    { name: "Gallery", path: "/admin/gallery", heading: "Gallery" },
    { name: "Timeline", path: "/admin/timeline", heading: "Timeline" },
    { name: "Games", path: "/admin/games", heading: "Games" },
    { name: "Products", path: "/admin/products", heading: "Products" },
    { name: "Affiliates", path: "/admin/affiliates", heading: "Affiliate Links" },
    { name: "Messages", path: "/admin/messages", heading: "Messages" },
    { name: "Settings", path: "/admin/settings", heading: "Settings" },
  ];

  for (const pageInfo of pages) {
    test(`should navigate to ${pageInfo.name} page`, async ({ page }) => {
      await page.click(`a:has-text("${pageInfo.name}")`);
      await page.waitForURL(pageInfo.path);
      await expect(page.locator(`h1`)).toContainText(pageInfo.heading);
    });
  }

  test("should show sidebar on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator("aside")).toBeVisible();
  });

  test("should show hamburger menu on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("button[aria-label*='Open sidebar']")).toBeVisible();
  });

  test("should open sidebar on mobile when hamburger clicked", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click("button[aria-label*='Open sidebar']");
    await expect(page.locator("aside")).toBeVisible();
  });
});
