/**
 * Creator Dashboard E2E Tests v1.0.0
 */

import { test, expect } from "../fixtures/auth";
import { CreatorDashboard, CreatorOrders } from "../pages/creator";

test.describe("Creator Dashboard", () => {
  test("Dashboard shows metric cards", async ({ creatorPage }) => {
    const dashboard = new CreatorDashboard(creatorPage);
    await dashboard.goto();
    const cards = await dashboard.getMetricCards();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("Dashboard title is visible", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/dashboard");
    await expect(creatorPage.locator("h1")).toContainText(/Dashboard/);
  });

  test("Orders page loads", async ({ creatorPage }) => {
    const orders = new CreatorOrders(creatorPage);
    await orders.goto();
    await expect(creatorPage.locator("h1")).toContainText(/Orders/);
  });

  test("Orders page shows data table", async ({ creatorPage }) => {
    const orders = new CreatorOrders(creatorPage);
    await orders.goto();
    const count = await orders.getOrderCount();
    expect(count).toBeGreaterThan(0);
  });

  test("Products page loads", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/products");
    await creatorPage.waitForLoadState("networkidle");
    await expect(creatorPage.locator("h1")).toContainText(/Storefront|Products/);
  });

  test("Analytics page loads", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/analytics");
    await creatorPage.waitForLoadState("networkidle");
    await expect(creatorPage.locator("h1")).toContainText(/Analytics/);
  });

  test("Customers page loads", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/customers");
    await creatorPage.waitForLoadState("networkidle");
    await expect(creatorPage.locator("h1")).toContainText(/Customers/);
  });

  test("Settings page loads", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/settings");
    await creatorPage.waitForLoadState("networkidle");
    await expect(creatorPage.locator("h1")).toContainText(/Settings/);
  });

  test("Billing page loads", async ({ creatorPage }) => {
    await creatorPage.goto("/admin/billing");
    await creatorPage.waitForLoadState("networkidle");
    await expect(creatorPage.locator("h1")).toContainText(/Billing/);
  });
});
