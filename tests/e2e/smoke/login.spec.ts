import { test, expect } from "../shared/fixtures";

const {
  CREATOR_EMAIL = "",
  CREATOR_PASSWORD = "",
  AGENCY_OWNER_EMAIL = "",
  AGENCY_OWNER_PASSWORD = "",
  SUPERADMIN_EMAIL = "",
  SUPERADMIN_PASSWORD = "",
} = process.env;

test.describe("Level 1 — Smoke: Authentication", () => {
  test("creator login succeeds", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(CREATOR_EMAIL, CREATOR_PASSWORD);
    await loginPage.expectRedirectTo(/\/admin\/dashboard/);
  });

  test("agency owner login succeeds", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(AGENCY_OWNER_EMAIL, AGENCY_OWNER_PASSWORD);
    await loginPage.expectRedirectTo(/\/agency/);
  });

  test("super admin login succeeds", async ({ loginPage }) => {
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

test.describe("Level 1 — Smoke: Creator", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(CREATOR_EMAIL, CREATOR_PASSWORD);
  });

  test("dashboard loads with metrics", async ({ dashboardPage }) => {
    await dashboardPage.expectWelcomeMessage("");
    await dashboardPage.expectHealthVisible();
  });

  test("builder loads", async ({ page }) => {
    await page.goto("/builder");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/builder/);
  });

  test("storefront renders", async ({ page }) => {
    await page.goto("/demo");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Level 1 — Smoke: Super Admin", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
  });

  test("dashboard loads", async ({ page }) => {
    await expect(page.locator("text=Platform Dashboard").first()).toBeVisible({ timeout: 10000 });
  });

  test("themes page loads from registry", async ({ page }) => {
    await page.goto("/super-admin/themes");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Themes").first()).toBeVisible();
  });

  test("templates page loads from registry", async ({ page }) => {
    await page.goto("/super-admin/templates");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Website Templates").first()).toBeVisible();
  });

  test("activity page loads", async ({ page }) => {
    await page.goto("/super-admin/activity");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Platform Activity").first()).toBeVisible();
  });

  test("revenue management loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Revenue Management").first()).toBeVisible();
  });
});
