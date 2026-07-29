import { test, expect } from "../shared/fixtures";
import { getSuperAdmin, disconnectDb } from "../shared/database";

let SUPER_ADMIN_KNOWN_PASSWORD = "TestPass123!";

test.describe("Level 1 — Smoke: Authentication", () => {
  let superAdminEmail: string;

  test.beforeAll(async () => {
    const admin = await getSuperAdmin();
    if (!admin) throw new Error("Super Admin not found — seed the database.");
    superAdminEmail = admin.email;
  });

  test.afterAll(async () => {
    await disconnectDb();
  });

  test("super admin login succeeds", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(superAdminEmail, SUPER_ADMIN_KNOWN_PASSWORD);
    await loginPage.expectRedirectTo(/\/super-admin/);
  });

  test("invalid login shows error", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("invalid@test.com", "wrong");
    await loginPage.expectError();
  });
});

test.describe("Level 1 — Smoke: Super Admin", () => {
  test.beforeAll(async () => {
    const admin = await getSuperAdmin();
    if (!admin) throw new Error("Super Admin not found.");
    superAdminEmail = admin.email;
  });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(superAdminEmail, SUPER_ADMIN_KNOWN_PASSWORD);
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

  test("revenue management settings loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Billing Settings").first()).toBeVisible();
  });

  test("commission center loads", async ({ page }) => {
    await page.goto("/super-admin/revenue-management/commissions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Commission Center").first()).toBeVisible();
  });

  test("audit page loads", async ({ page }) => {
    await page.goto("/super-admin/audit");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Audit Log").first()).toBeVisible();
  });

  test("health page loads", async ({ page }) => {
    await page.goto("/super-admin/health");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=System Health").first()).toBeVisible();
  });

  test("websites page loads", async ({ page }) => {
    await page.goto("/super-admin/websites");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Websites").first()).toBeVisible();
  });
});

test.describe("Level 1 — Smoke: Super Admin Billing", () => {
  test.beforeAll(async () => {
    const admin = await getSuperAdmin();
    if (!admin) throw new Error("Super Admin not found.");
    superAdminEmail = admin.email;
  });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(superAdminEmail, SUPER_ADMIN_KNOWN_PASSWORD);
  });

  test("revenue dashboard shows MRR metric", async ({ page }) => {
    await page.goto("/super-admin/revenue-management");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=MRR").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=ARR").first()).toBeVisible();
    await expect(page.locator("text=Creator Subs").first()).toBeVisible();
  });

  test("revenue reports page loads", async ({ page }) => {
    await page.goto("/super-admin/revenue");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Revenue").first()).toBeVisible();
  });

  test("subscriptions page loads", async ({ page }) => {
    await page.goto("/super-admin/subscriptions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Subscriptions").first()).toBeVisible();
  });
});
