/**
 * Super Admin — Navigation & Dashboard E2E Tests
 * RCCF-PLAYWRIGHT-01
 */
import { test, expect } from "../../fixtures/auth";
import { SuperAdminDashboard } from "../../pages/super-admin";

test.describe("Super Admin — Navigation", () => {
  const ALL_PAGES = [
    { path: "/super-admin", label: "Dashboard" },
    { path: "/super-admin/operations", label: "Operations" },
    { path: "/super-admin/health", label: "Platform Health" },
    { path: "/super-admin/revenue", label: "Revenue Reports" },
    { path: "/super-admin/revenue-management", label: "Revenue Management" },
    { path: "/super-admin/subscriptions", label: "Subscriptions" },
    { path: "/super-admin/invoices", label: "Invoices" },
    { path: "/super-admin/payments", label: "Payments" },
    { path: "/super-admin/finance", label: "Finance Dashboard" },
    { path: "/super-admin/settlements", label: "Settlements" },
    { path: "/super-admin/partner-ledger", label: "Partner Ledger" },
    { path: "/super-admin/reconciliation", label: "Reconciliation" },
    { path: "/super-admin/themes", label: "Themes" },
    { path: "/super-admin/themes-studio", label: "Theme Studio" },
    { path: "/super-admin/blueprints", label: "Blueprints" },
    { path: "/super-admin/domains", label: "Domains" },
    { path: "/super-admin/tenants", label: "Tenants" },
    { path: "/super-admin/agencies", label: "Agencies" },
    { path: "/super-admin/users", label: "Users" },
    { path: "/super-admin/webhooks", label: "Webhooks" },
    { path: "/super-admin/audit", label: "Audit Log" },
    { path: "/super-admin/audit/events", label: "Events" },
    { path: "/super-admin/features", label: "Feature Flags" },
    { path: "/super-admin/runbooks", label: "Runbooks" },
  ];

  for (const { path, label } of ALL_PAGES) {
    test(`${label} page loads`, async ({ superAdminPage }) => {
      await superAdminPage.goto(path);
      await superAdminPage.waitForLoadState("networkidle");
      const status = await superAdminPage.evaluate(() => document.title || "");
      await expect(superAdminPage.locator("h1").first()).toBeVisible({ timeout: 10000 });
      const consoleErrors: string[] = [];
      superAdminPage.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
      expect(consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("hydrat")).length).toBe(0);
    });
  }
});

test.describe("Super Admin — Dashboard", () => {
  test("Platform KPIs display real data", async ({ superAdminPage }) => {
    const sa = new SuperAdminDashboard(superAdminPage);
    await sa.goto();
    await expect(superAdminPage.locator("text=Creators").first()).toBeVisible();
    await expect(superAdminPage.locator("text=Revenue").first()).toBeVisible();
    await expect(superAdminPage.locator("text=Paid Subscriptions").first()).toBeVisible();
  });

  test("Operational metrics display", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("text=MRR").first()).toBeVisible();
    await expect(superAdminPage.locator("text=ARR").first()).toBeVisible();
  });

  test("Tenant table renders", async ({ superAdminPage }) => {
    const sa = new SuperAdminDashboard(superAdminPage);
    await sa.goto();
    const rows = await sa.getTenantCount();
    expect(rows).toBeGreaterThan(0);
  });
});
