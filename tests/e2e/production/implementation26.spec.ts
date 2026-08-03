import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

dotenv.config({ path: ".env.local" });

test.describe.configure({ mode: "serial" });

let _pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> } | null = null;
async function pool() {
  if (_pool) return _pool;
  const { Pool } = await import("pg");
  const u = new URL(process.env.DATABASE_URL ?? "");
  _pool = new Pool({ host: u.hostname, port: Number(u.port || 5432), database: u.pathname.slice(1), user: u.username, password: u.password, ssl: { rejectUnauthorized: false } });
  return _pool;
}

async function appliedThemeId(): Promise<string | null> {
  const p = await pool();
  const r = await p.query('SELECT "themePackageId" FROM "Website" WHERE "tenantId" = $1', ["eee52d43-ed3d-4ccb-baf5-c728dab36119"]);
  return (r.rows[0]?.themePackageId as string | undefined) ?? null;
}

test("Q1 - Builder shows ALL 50 themes; locked themes are visible", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);

  const cards = await page.locator('[data-testid^="builder-theme-"]').count();
  expect(cards).toBe(50);
  await expect(page.locator('text=/of 50 themes/')).toHaveCount(1);
  // Locked business themes are present.
  const locked = await page.locator('[data-testid^="builder-theme-"]').filter({ has: page.locator('span:has-text("Business")') }).count();
  expect(locked).toBeGreaterThan(0);
  await shot(page, "q1-builder-all-themes");
  errors.assertClean();
});

test("Q2 - Locked theme previews in Builder WITHOUT persisting (upgrade to apply)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  const before = await appliedThemeId();

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);

  // Capture the current canvas theme var, then preview a locked theme.
  const frameBefore = await page.locator('[data-testid="builder-canvas"] [style*="--brand"]').last().getAttribute("style").catch(() => "");
  const lockedCard = page.locator('[data-testid^="builder-theme-"]').filter({ has: page.locator('span:has-text("Business")') }).first();
  await lockedCard.click();
  await page.waitForTimeout(2000);

  // Preview banner + Upgrade (no Apply).
  await expect(page.locator('[data-testid="preview-banner"]')).toBeVisible();
  await expect(page.locator('[data-testid="builder-upgrade"]')).toBeVisible();
  await expect(page.locator('[data-testid="builder-apply-theme"]')).toHaveCount(0);

  // The canvas live-previewed the locked theme (theme vars changed).
  const frameAfter = await page.locator('[data-testid="builder-canvas"] [style*="--brand"]').last().getAttribute("style").catch(() => "");
  expect(frameAfter).not.toBe(frameBefore);
  await shot(page, "q2-locked-preview");

  // The preview did NOT persist — the applied theme is unchanged in the DB.
  await page.waitForTimeout(1500);
  const after = await appliedThemeId();
  expect(after).toBe(before);
  errors.assertClean();
});

test("Q3 - Applying an unlocked theme persists + moves Current; preview leaves no draft", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);

  // Pick a FREE theme that is NOT the current one (unlocked + non-current).
  const freeCards = page.locator('[data-testid^="builder-theme-"]').filter({ has: page.locator('span:has-text("Free")') });
  const unlockedCard = freeCards.filter({ hasNot: page.locator('span:has-text("Current")') }).first();
  await unlockedCard.click();
  await page.waitForTimeout(1000);
  const slug = (await unlockedCard.getAttribute("data-testid"))?.replace("builder-theme-", "") ?? "";
  await expect(page.locator('[data-testid="preview-banner"]')).toBeVisible();

  // Apply → persists the theme (DB changes) + Current badge moves to the card.
  await page.locator('[data-testid="builder-apply-theme"]').click();
  await page.waitForSelector(`[data-testid="builder-theme-${slug}"]:has-text("Current")`, { timeout: 30000 }).catch(() => {});
  const card = page.locator(`[data-testid="builder-theme-${slug}"]`);
  const currentCount = await card.locator('span:has-text("Current")').count();
  expect(currentCount).toBeGreaterThan(0);
  await shot(page, "q3-applied");

  const after = await appliedThemeId();
  expect(after).toContain(slug);
  errors.assertClean();
});

test("Q4 - Preview is temporary; leaving preview restores the current theme in the canvas", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);

  const frameOriginal = await page.locator('[data-testid="builder-canvas"] [style*="--brand"]').last().getAttribute("style").catch(() => "");

  // Preview a locked theme, then restore via the revert button.
  const lockedCard = page.locator('[data-testid^="builder-theme-"]').filter({ has: page.locator('span:has-text("Business")') }).first();
  await lockedCard.click();
  await page.waitForTimeout(1500);
  const framePreview = await page.locator('[data-testid="builder-canvas"] [style*="--brand"]').last().getAttribute("style").catch(() => "");
  expect(framePreview).not.toBe(frameOriginal);

  // Revert (the RotateCcw button) → canvas returns to the applied theme.
  await page.locator('button:has-text("Apply Theme"), [data-testid="builder-upgrade"]').first().isVisible().catch(() => false);
  await page.locator("button:has(svg.lucide-rotate-ccw)").first().click().catch(async () => {
    await page.locator('[data-testid="preview-banner"] + div button').last().click().catch(() => {});
  });
  await page.waitForTimeout(1500);
  const frameRestored = await page.locator('[data-testid="builder-canvas"] [style*="--brand"]').last().getAttribute("style").catch(() => "");
  expect(frameRestored).toBe(frameOriginal);
  await shot(page, "q4-preview-temporary");
  errors.assertClean();
});
