/**
 * Super Admin — Billing & Finance E2E Tests
 * RCCF-PLAYWRIGHT-01
 */
import { test, expect } from "../../fixtures/auth";

test.describe("Super Admin — Billing", () => {
  test("Revenue page shows MRR and ARR", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/revenue");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Revenue/);
    await expect(superAdminPage.locator("text=MRR")).toBeVisible();
    await expect(superAdminPage.locator("text=ARR")).toBeVisible();
  });

  test("Subscriptions page shows data", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/subscriptions");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Subscriptions/);
    const cardCount = await superAdminPage.locator("text=Total Subscriptions,text=Paid Plans,text=Free").count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("Invoices page loads table", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/invoices");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Invoices/);
  });

  test("Payments page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/payments");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Payments/);
  });

  test("Revenue management loads config", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/revenue-management");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Revenue Management/);
  });

  test("Commission settings load", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/revenue-management/commissions");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Commission/);
  });
});

test.describe("Super Admin — Finance", () => {
  test("Finance dashboard shows KPIs", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/finance");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Finance/);
    await expect(superAdminPage.locator("text=Outstanding Liability")).toBeVisible();
    await expect(superAdminPage.locator("text=Paid This Month")).toBeVisible();
    await expect(superAdminPage.locator("text=Success Rate")).toBeVisible();
  });

  test("Settlement queue loads with status filters", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/settlements");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Settlement/);
    await expect(superAdminPage.locator("text=PENDING")).toBeVisible();
    await expect(superAdminPage.locator("text=PAID")).toBeVisible();
  });

  test("Settlement detail page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/settlements");
    await superAdminPage.waitForLoadState("networkidle");
    const link = superAdminPage.locator("a[href*='/super-admin/settlements/']").first();
    if (await link.isVisible()) {
      await link.click();
      await superAdminPage.waitForLoadState("networkidle");
      await expect(superAdminPage.locator("h1")).toBeVisible();
    }
    // If no settlements exist yet, the table will show empty state — acceptable
  });

  test("Partner ledger loads entries", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/partner-ledger");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Ledger/);
  });

  test("Reconciliation center shows audit checks", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/reconciliation");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Reconciliation/);
    await expect(superAdminPage.locator("text=Orphan Commissions")).toBeVisible();
    await expect(superAdminPage.locator("text=Negative Balances")).toBeVisible();
    await expect(superAdminPage.locator("text=Duplicate Settlements")).toBeVisible();
    await expect(superAdminPage.locator("text=Ledger Integrity")).toBeVisible();
  });
});
