import { test, expect } from "../shared/fixtures";

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "";

test.describe("Level 1 — Smoke: Authentication", () => {
  test("super admin login succeeds", async ({ loginPage }) => {
    test.skip(!SUPERADMIN_EMAIL, "SUPERADMIN_EMAIL not set");
    await loginPage.goto();
    await loginPage.login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await loginPage.expectRedirectTo(/\/super-admin/);
  });

  test("invalid login shows error", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("invalid@test.com", "wrong");
    await loginPage.expectError();
  });
});

test.describe("Level 1 — Smoke: Super Admin", () => {
  test.beforeEach(async ({ loginPage }) => {
    test.skip(!SUPERADMIN_EMAIL, "SUPERADMIN_EMAIL not set");
    await loginPage.goto();
    await loginPage.login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
  });

  test("dashboard loads", async ({ page }) => {
    await expect(page.locator("text=Platform Dashboard").first()).toBeVisible({ timeout: 15000 });
  });

  test("themes page loads from registry", async ({ page }) => {
    await page.goto("/super-admin/themes");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Themes").first()).toBeVisible({ timeout: 15000 });
  });

  test("templates page loads from registry", async ({ page }) => {
    await page.goto("/super-admin/templates");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Website Templates").first()).toBeVisible({ timeout: 15000 });
  });

  test("activity page loads", async ({ page }) => {
    await page.goto("/super-admin/activity");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Platform Activity").first()).toBeVisible({ timeout: 15000 });
  });

  test("insights page loads", async ({ page }) => {
    await page.goto("/super-admin/insights");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Platform Insights").first()).toBeVisible({ timeout: 15000 });
  });

  test("revenue management loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Revenue Management").first()).toBeVisible({ timeout: 15000 });
  });

  test("commission center loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/commissions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Commission Center").first()).toBeVisible({ timeout: 15000 });
  });

  test("audit page loads", async ({ page }) => {
    await page.goto("/super-admin/audit");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Audit Log").first()).toBeVisible({ timeout: 15000 });
  });

  test("health page loads", async ({ page }) => {
    await page.goto("/super-admin/health");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=System Health").first()).toBeVisible({ timeout: 15000 });
  });

  test("websites page loads", async ({ page }) => {
    await page.goto("/super-admin/websites");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Websites").first()).toBeVisible({ timeout: 15000 });
  });

  test("revenue management settings loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Billing Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
