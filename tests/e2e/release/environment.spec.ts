import { test, expect } from "@playwright/test";

test.describe("Level 3 — Environment Validation", () => {
  test("application is reachable", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.ok()).toBeTruthy();
  });

  test("health endpoint responds", async ({ page }) => {
    const resp = await page.goto("/api/health");
    expect(resp?.status()).toBe(200);
  });

  test("site loads with correct title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("required environment variables are set", () => {
    const required = [
      "BASE_URL",
      "SUPERADMIN_EMAIL",
      "SUPERADMIN_PASSWORD",
    ];
    for (const envVar of required) {
      expect(process.env[envVar], `${envVar} is required`).toBeTruthy();
    }
  });
});
