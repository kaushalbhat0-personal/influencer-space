import { test, expect } from "@playwright/test";

test("Fan visits influencer landing page", async ({ page }) => {
  await page.goto("http://snax.localhost:3000");

  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
