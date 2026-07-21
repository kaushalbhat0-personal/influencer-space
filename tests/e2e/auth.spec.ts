/**
 * Authentication E2E Tests v1.0.0
 */

import { test, expect } from "../fixtures/auth";
import { CreatorDashboard } from "../pages/creator";
import { SuperAdminDashboard } from "../pages/super-admin";

test.describe("Authentication", () => {
  test("Super Admin login redirects to /super-admin", async ({ superAdminPage }) => {
    await expect(superAdminPage).toHaveURL(/super-admin/);
    const sa = new SuperAdminDashboard(superAdminPage);
    await expect(superAdminPage.locator("h1")).toContainText(/Platform Dashboard|Dashboard/);
  });

  test("Creator login redirects to /admin/dashboard", async ({ creatorPage }) => {
    await expect(creatorPage).toHaveURL(/admin\/dashboard/);
    const dashboard = new CreatorDashboard(creatorPage);
    await expect(creatorPage.locator("h1")).toContainText(/Dashboard/);
  });

  test("Agency login redirects to /agency", async ({ agencyPage }) => {
    await expect(agencyPage).toHaveURL(/agency/);
  });

  test("Unauthenticated user is redirected to login", async ({ guestPage }) => {
    await guestPage.goto("/admin/dashboard");
    await expect(guestPage).toHaveURL(/login/);
  });

  test("Creator cannot access Super Admin", async ({ creatorPage }) => {
    await creatorPage.goto("/super-admin");
    await expect(creatorPage).not.toHaveURL(/super-admin/);
  });
});
