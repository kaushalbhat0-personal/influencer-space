/**
 * Super Admin E2E Tests v2.0.0 — RCCF-PLAYWRIGHT-01
 *
 * Legacy tests kept for backward compatibility. New comprehensive tests are in:
 *   - super-admin/navigation.spec.ts
 *   - super-admin/billing-finance.spec.ts
 *   - super-admin/marketplace-domains.spec.ts
 */

import { test, expect } from "../fixtures/auth";
import { SuperAdminDashboard } from "../pages/super-admin";

test.describe("Super Admin — Core Pages", () => {
  test("Dashboard shows metrics", async ({ superAdminPage }) => {
    const sa = new SuperAdminDashboard(superAdminPage);
    await sa.goto();
    await expect(superAdminPage.locator("h1")).toContainText(/Dashboard/);
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

  test("Audit log page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/audit");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Audit/);
  });

  test("Health monitoring page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/health");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Health/);
  });

  test("Feature flags page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/features");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toBeVisible();
  });
});
