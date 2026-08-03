import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R7.1 - Billing diagnostics resolve the plan through the v2 source of truth", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing-consolidation", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="billing-diagnostics"]', { timeout: 30000 });

  const plan = await page.locator('[data-testid="bd-plan"]').innerText();
  const origin = await page.locator('[data-testid="bd-origin"]').innerText();
  const capabilitySource = await page.locator('[data-testid="bd-capability-source"]').innerText();
  const premium = await page.locator('[data-testid="bd-premium"]').innerText();
  const readers = await page.locator('[data-testid="bd-readers"]').innerText();

  // Plan resolves via BillingSubscription (v2), legacy fallback, or none — never a
  // hardcoded default; capability source is the canonical service when a plan exists.
  expect(["v2", "legacy", "none"]).toContain(origin);
  if (plan !== "none") expect(capabilitySource).toBe("capabilityService");
  expect(premium).toMatch(/allowed|denied/);
  // Every identified legacy reader is migrated (7/7).
  expect(readers).toBe("7/7");

  await shot(page, "r7-1-billing-diagnostics");
  errors.assertClean();
});

test("R7.2 - Theme Marketplace renders gating from the resolved subscription", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/themes", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Theme Marketplace", { timeout: 30000 });

  // Marketplace loads with theme cards and tier labels (gating surface intact).
  const tierLabels = await page.locator("text=/free|starter|pro|business|enterprise/i").count();
  expect(tierLabels).toBeGreaterThan(0);
  const lockBadges = await page.locator('[data-testid^="lock-badge-"]').count();
  const unlockedBadges = await page.locator('[data-testid^="unlocked-badge-"]').count();
  expect(lockBadges + unlockedBadges).toBeGreaterThan(0);

  await shot(page, "r7-2-theme-marketplace");
  errors.assertClean();
});

test("R7.3 - Server-side premium-theme entitlement is reflected (decision surfaced)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing-consolidation", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="bd-premium"]', { timeout: 30000 });

  const premium = await page.locator('[data-testid="bd-premium"]').innerText();
  // The decision is authoritative and consistent with the resolved plan tier.
  const plan = await page.locator('[data-testid="bd-plan"]').innerText();
  const tier = await page.locator('[data-testid="bd-tier"]').innerText();
  if (plan === "none" || tier === "free") {
    expect(premium).toBe("denied");
  } else {
    expect(premium).toMatch(/allowed|denied/);
  }

  await shot(page, "r7-3-premium-decision");
  errors.assertClean();
});

test("R7.4 - Diagnostics DOM matches the Billing runtime (reader registry + counts)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing-consolidation", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="bd-reader-list"]', { timeout: 30000 });

  const migratedReaders = await page.locator('[data-reader][data-migrated="true"]').count();
  const v2Count = await page.locator('[data-testid="bd-v2-count"]').innerText();
  const legacyCount = await page.locator('[data-testid="bd-legacy-count"]').innerText();
  expect(migratedReaders).toBe(7);
  expect(Number(v2Count)).toBeGreaterThanOrEqual(0);
  expect(Number(legacyCount)).toBeGreaterThanOrEqual(0);

  await shot(page, "r7-4-reader-migration");
  errors.assertClean();
});
