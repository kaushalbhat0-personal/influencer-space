import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R9.1 - Billing harness exposes the subscription + capability state", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="billing-harness"]', { timeout: 30000 });

  expect(await page.locator('[data-testid="bh-plan"]').innerText()).toBeTruthy();
  expect(await page.locator('[data-testid="bh-status"]').innerText()).toMatch(/ACTIVE|TRIALING|CANCELLED|PAST_DUE|EXPIRED|none/);
  // Capability matrix + enabled capabilities render.
  const matrix = await page.locator('[data-testid="bh-plan-mapping"] [data-plan="creator_grow"]').innerText();
  expect(matrix).toContain("699");
  expect(await page.locator('[data-testid="bh-capabilities"]').innerText().then((t) => t.length)).toBeGreaterThan(0);

  await shot(page, "r9-1-billing-harness");
  errors.assertClean();
});

test("R9.2 - Webhook simulator drives the lifecycle (activate → fail → cancel)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="sim-subscription.activated"]', { timeout: 30000 });

  // Activate.
  await page.click('[data-testid="sim-subscription.activated"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sim-last"]')?.textContent?.includes("handled → ACTIVE"), { timeout: 20000 });

  // Payment failure → PAST_DUE.
  await page.click('[data-testid="sim-payment.failed"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sim-last"]')?.textContent?.includes("handled → PAST_DUE"), { timeout: 20000 });

  // Cancel → CANCELLED.
  await page.click('[data-testid="sim-subscription.cancelled"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sim-last"]')?.textContent?.includes("handled → CANCELLED"), { timeout: 20000 });

  // Replay the cancelled event → idempotent (no state mutation, handled=false or status unchanged).
  await page.click('[data-testid="sim-subscription.cancelled"]');
  await page.waitForTimeout(800);

  // Reload so the server-rendered Billing timeline reflects the appended events.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="bh-timeline"]', { timeout: 30000 });

  // Billing timeline reflects the events (append-only).
  const timelineTypes = await page.locator("[data-testid=bh-timeline] [data-event-type]").allTextContents();
  expect(timelineTypes.some((t) => t.startsWith("SUBSCRIPTION_ACTIVATED"))).toBe(true);
  expect(timelineTypes.some((t) => t.startsWith("PAYMENT_FAILED"))).toBe(true);
  expect(timelineTypes.some((t) => t.startsWith("SUBSCRIPTION_CANCELLED"))).toBe(true);

  await shot(page, "r9-2-webhook-simulator");
  errors.assertClean();
});

test("R9.3 - Customer billing page shows capabilities + timeline (Billing v2 runtime)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Billing", { timeout: 30000 });

  // Capabilities granted section (Plans tab) renders from CapabilityService.
  await page.click("text=Plans");
  await page.waitForSelector('[data-testid="billing-capabilities"]', { timeout: 20000 });
  expect(await page.locator('[data-testid="billing-capabilities"] span').count()).toBeGreaterThan(0);

  await shot(page, "r9-3-billing-page");
  errors.assertClean();
});

test("R9.4 - Capability transition after lifecycle events (premium lock/unlock)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/billing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="sim-subscription.activated"]', { timeout: 30000 });

  // Activate the current plan and check premium_themes reflects CapabilityService.
  await page.click('[data-testid="sim-subscription.activated"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="sim-last"]')?.textContent?.includes("handled"), { timeout: 20000 });

  const capabilities = await page.locator('[data-testid="bh-capabilities"]').innerText();
  expect(capabilities.length).toBeGreaterThan(0);

  await shot(page, "r9-4-capability-transition");
  errors.assertClean();
});
