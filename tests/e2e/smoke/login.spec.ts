import { test, expect } from "@playwright/test";
import { loginAsCreator, loginAsAgency, loginAsSuperAdmin, logout } from "../shared/auth";

test.describe("Smoke: Authentication", () => {
  test("creator login succeeds", async ({ page }) => {
    await loginAsCreator(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("agency login succeeds", async ({ page }) => {
    await loginAsAgency(page);
    await expect(page).toHaveURL(/\/agency/);
  });

  test("super admin login succeeds", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await expect(page).toHaveURL(/\/super-admin/);
  });
});

test.describe("Smoke: Creator Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCreator(page);
  });

  test("dashboard loads with metrics", async ({ page }) => {
    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Website Health").first()).toBeVisible();
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

test.describe("Smoke: Super Admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
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

  test("insights page loads", async ({ page }) => {
    await page.goto("/super-admin/insights");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Platform Insights").first()).toBeVisible();
  });

  test("revenue management loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Revenue Management").first()).toBeVisible();
  });

  test("billing settings loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Billing Settings").first()).toBeVisible();
  });

  test("commission center loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/commissions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Commission Center").first()).toBeVisible();
  });
});

test.describe("Smoke: Billing", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test("revenue management dashboard loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=MRR").first()).toBeVisible();
    await expect(page.locator("text=ARR").first()).toBeVisible();
    await expect(page.locator("text=Creator Subs").first()).toBeVisible();
  });
});
