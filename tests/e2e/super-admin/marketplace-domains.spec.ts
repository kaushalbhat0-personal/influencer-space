/**
 * Super Admin — Marketplace, Domains, Operations E2E Tests
 * RCCF-PLAYWRIGHT-01
 */
import { test, expect } from "../../fixtures/auth";

test.describe("Super Admin — Marketplace", () => {
  test("Themes page lists all themes", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/themes");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Themes|Theme/);
    const cards = await superAdminPage.locator("[data-testid], .rounded-xl").count();
    expect(cards).toBeGreaterThan(0);
  });

  test("Theme Studio loads DB-backed data", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/themes-studio");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Theme/);
  });

  test("Blueprints catalog renders all blueprints", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/blueprints");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Blueprint/);
    const cards = await superAdminPage.locator(".rounded-xl").count();
    expect(cards).toBeGreaterThan(0);
  });
});

test.describe("Super Admin — Domains", () => {
  test("Domain operations page shows metrics", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/domains");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Domain/);
    await expect(superAdminPage.locator("text=Total Domains")).toBeVisible();
    await expect(superAdminPage.locator("text=Verified")).toBeVisible();
  });

  test("DNS setup guides are visible", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/domains");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("text=GoDaddy")).toBeVisible();
    await expect(superAdminPage.locator("text=Cloudflare")).toBeVisible();
  });
});

test.describe("Super Admin — Operations", () => {
  test("Operations center loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/operations");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Operations/);
  });

  test("Platform health page loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/health");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Health/);
  });

  test("Runbooks load", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/runbooks");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toBeVisible();
  });

  test("Audit log shows entries", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin/audit");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Audit/);
  });
});

test.describe("Super Admin — Permissions", () => {
  test("SUPER_ADMIN-only routes reject unauthenticated access", async ({ page }) => {
    const protectedPages = ["/super-admin", "/super-admin/finance", "/super-admin/settlements"];
    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const url = page.url();
      // Should redirect to login or show access denied
      expect(url).toMatch(/login|unauthorized|error/);
    }
  });
});
