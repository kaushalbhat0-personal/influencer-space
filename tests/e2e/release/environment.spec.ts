import { test, expect } from "@playwright/test";
import { getSuperAdmin, disconnectDb } from "../shared/database";

test.describe("Level 3 — Environment Validation", () => {
  test.afterAll(async () => {
    await disconnectDb();
  });

  test("application is reachable", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.ok()).toBeTruthy();
  });

  test("health endpoint responds", async ({ page }) => {
    const healthSecret = process.env.HEALTH_SECRET ?? "local-dev-secret";
    const resp = await page.request.get("/api/health", {
      headers: { "x-health-secret": healthSecret },
    });
    expect(resp.status()).toBe(200);
  });

  test("database has Super Admin account", async () => {
    const admin = await getSuperAdmin();
    expect(admin).not.toBeNull();
    expect(admin!.role).toBe("SUPER_ADMIN");
    expect(admin!.email).toBeTruthy();
  });

  test("site loads with correct title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
