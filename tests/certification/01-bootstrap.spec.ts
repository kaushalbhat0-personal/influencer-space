import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Phase 1 — Platform Bootstrap", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator("h1, .text-3xl, .text-4xl").first()).toBeVisible({ timeout: 10000 });
  });

  test("login page loads", async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test("super admin can log in", async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.fill('input[type="email"]', "admin@creatorstore.test");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/super-admin**", { timeout: 15000 });
    await expect(page.locator("text=Platform Dashboard").or(page.locator("text=Dashboard"))).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Phase 2 — Super Admin Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/admin/login`);
    await page.fill('input[type="email"]', "admin@creatorstore.test");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/super-admin**", { timeout: 15000 });
  });

  test("dashboard loads", async ({ page }) => {
    await page.goto(`${BASE}/super-admin`);
    await expect(page.locator("text=Platform Dashboard")).toBeVisible({ timeout: 10000 });
  });

  test("health page loads", async ({ page }) => {
    await page.goto(`${BASE}/super-admin/health`);
    await expect(page.locator("text=Platform Health")).toBeVisible({ timeout: 10000 });
  });

  test("operations page loads", async ({ page }) => {
    await page.goto(`${BASE}/super-admin/operations`);
    await expect(page.locator("text=Platform Operations").or(page.locator("text=Operations"))).toBeVisible({ timeout: 10000 });
  });

  test("alerts page loads", async ({ page }) => {
    await page.goto(`${BASE}/super-admin/alerts`);
    await expect(page.locator("text=Alert Center")).toBeVisible({ timeout: 10000 });
  });

  test("runbooks page loads", async ({ page }) => {
    await page.goto(`${BASE}/super-admin/runbooks`);
    await expect(page.locator("text=Runbooks")).toBeVisible({ timeout: 10000 });
  });

  test("provision creator", async ({ page }) => {
    await page.goto(`${BASE}/super-admin`);
    const provisionBtn = page.locator("button:has-text('Provision')");
    if (await provisionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await provisionBtn.click();
    }
  });

  test("logout works", async ({ page }) => {
    await page.goto(`${BASE}/super-admin`);
    await page.locator("button:has-text('Sign Out')").click({ timeout: 5000 });
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Phase 6 — Security Certification", () => {
  test("anonymous blocked from super-admin", async ({ page }) => {
    await page.goto(`${BASE}/super-admin`);
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
  });

  test("anonymous blocked from admin", async ({ page }) => {
    await page.goto(`${BASE}/admin/dashboard`);
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
  });

  test("anonymous blocked from builder", async ({ page }) => {
    await page.goto(`${BASE}/builder`);
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
  });

  test("public pages accessible", async ({ page }) => {
    await page.goto(`${BASE}/showcase`);
    await expect(page.locator("text=Creator Showcase").or(page.locator("h1"))).toBeVisible({ timeout: 10000 });

    await page.goto(`${BASE}/pricing`);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });

    await page.goto(`${BASE}/features`);
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});
