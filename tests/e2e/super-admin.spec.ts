/**
 * Super Admin E2E Tests v1.0.0
 */

import { test, expect } from "../fixtures/auth";
import { SuperAdminDashboard } from "../pages/super-admin";

test.describe("Super Admin", () => {
  test("Dashboard shows metrics", async ({ superAdminPage }) => {
    const sa = new SuperAdminDashboard(superAdminPage);
    await sa.goto();
    await expect(superAdminPage.locator("h1")).toContainText(/Dashboard/);
  });

  test("Has feature flags page", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/features");
    await superAdminPage.waitForLoadState("networkidle");
    const hasFeatures = await new SuperAdminDashboard(superAdminPage).hasFeatureFlags();
    expect(hasFeatures).toBe(true);
  });

  test("Has audit log page", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/audit");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Audit/);
  });

  test("Has health monitoring page", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/health");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Health/);
  });

  test("Revenue page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/revenue");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Revenue/);
  });

  test("Tenants page shows data", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/tenants");
    await superAdminPage.waitForLoadState("networkidle");
    const rows = await new SuperAdminDashboard(superAdminPage).getTenantCount();
    expect(rows).toBeGreaterThan(0);
  });

  test("Agencies page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/agencies");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Agencies/);
  });
});
