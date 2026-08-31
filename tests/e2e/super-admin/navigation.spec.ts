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
      await superAdminPage.goto(path, { waitUntil: "domcontentloaded" });
      await expect(superAdminPage.locator("h1").first()).toBeVisible({ timeout: 15000 });
      await expect(superAdminPage.locator("h1").first()).toContainText(/.+/, { timeout: 5000 });
    });
  }

  test("Super Admin single-context smoke: Dashboard → Themes → Templates → Activity (same session)", async ({ browser }) => {
    const E2E_PASSWORD_LOCAL = process.env.E2E_TEST_PASSWORD ?? "admin123";
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login?tenant=testcreator", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.fill('input#email', "admin@creatorstore.test");
    await page.fill('input#password', E2E_PASSWORD_LOCAL);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/super-admin**", { timeout: 30000 });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    const checks: Array<{ path: string; heading: RegExp }> = [
      { path: "/super-admin", heading: /Platform Dashboard|Dashboard/i },
      { path: "/super-admin/themes", heading: /Themes/i },
      { path: "/super-admin/templates", heading: /Website Templates|Templates/i },
      { path: "/super-admin/activity", heading: /Platform Activity|Activity/i },
    ];
    for (const { path, heading } of checks) {
      const t0 = Date.now();
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator("h1").first()).toContainText(heading, { timeout: 10000 });
      const ms = Date.now() - t0;
      expect(ms).toBeLessThan(15000);
      // No logout, no redirect to creator/agency dashboard, same context preserved.
      expect(page.url()).toContain("/super-admin");
    }
    await context.close();
  });
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
    await superAdminPage.goto("/super-admin", { waitUntil: "domcontentloaded" });
    await expect(superAdminPage.locator("h1").first()).toBeVisible({ timeout: 15000 });
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
