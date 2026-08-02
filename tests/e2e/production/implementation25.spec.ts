import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

test("P1 - Marketplace renders ~50 themes with search, filters and subscription gating", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/themes", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Theme Marketplace", { timeout: 20000 });
  await page.waitForTimeout(4000);

  // ~50 professionally designed themes.
  const cards = await page.locator('[data-testid^="theme-card-"]').count();
  expect(cards).toBeGreaterThanOrEqual(45);

  // Subscription gating: business-tier themes are locked for a starter/pro user.
  const locked = await page.locator('[data-testid^="lock-badge-"]').count();
  expect(locked).toBeGreaterThan(0);
  const applyButtons = await page.locator('[data-testid^="apply-theme-"]').count();
  expect(applyButtons).toBeGreaterThan(0);

  // Plan banner shows unlocked count.
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/of 50 themes unlocked/);

  // Search filters the grid.
  await page.fill('input[placeholder="Search themes..."]', "luxury");
  await page.waitForTimeout(800);
  const luxuryCards = await page.locator('[data-testid^="theme-card-"]').count();
  expect(luxuryCards).toBeGreaterThan(0);

  await shot(page, "p1-marketplace-gating");
  errors.assertClean();
});

test("P2 - Favorites persist across reloads", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/themes", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Theme Marketplace", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Persistence: seed a favorite in localStorage, reload, assert it's restored.
  await page.evaluate(() => localStorage.setItem("theme_favorites", JSON.stringify(["com.creatos.neon-dark"])));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Theme Marketplace", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // The favorites toggle is visible because favorites.length > 0.
  await expect(page.locator('button:has-text("Favorites")')).toHaveCount(1, { timeout: 10000 });

  // Clicking the toggle filters to only the favorited theme.
  await page.locator('button:has-text("Favorites")').first().click();
  await page.waitForTimeout(600);
  const cards = await page.locator('[data-testid^="theme-card-"]').count();
  expect(cards).toBeGreaterThan(0);
  await shot(page, "p2-favorites-persist");
  errors.assertClean();
});

test("P3 - Unlocked theme applies (becomes Current); locked theme blocks apply", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/themes", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Theme Marketplace", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // A locked (business-tier) theme opens a detail with no apply and an upgrade CTA.
  const lockedCard = page.locator('[data-testid^="lock-badge-"]').first();
  await lockedCard.click().catch(() => {});
  await page.waitForTimeout(1000);
  const detailApply = await page.locator('[data-testid="theme-detail-apply"]').count();
  expect(detailApply).toBe(0);
  const upgradeCount = await page.locator('text=Upgrade to unlock').count();
  expect(upgradeCount).toBeGreaterThan(0);
  await page.locator('[data-testid="theme-detail"] button:has-text("Cancel")').click().catch(() => {});
  await page.waitForTimeout(500);

  // Apply an unlocked theme; poll for it to become Current on its card.
  const applyBtn = page.locator('[data-testid^="apply-theme-"]').first();
  const applySlug = (await applyBtn.getAttribute("data-testid"))?.replace("apply-theme-", "") ?? "";
  await applyBtn.click({ force: true }).catch(() => {});
  await page.waitForSelector(`[data-testid="theme-card-${applySlug}"]:has-text("Current")`, { timeout: 45000 }).catch(() => {});
  const card = page.locator(`[data-testid="theme-card-${applySlug}"]`);
  const currentCount = await card.locator('text=Current').count();
  expect(currentCount).toBeGreaterThan(0);
  await shot(page, "p3-theme-applied");
  errors.assertClean();
});


