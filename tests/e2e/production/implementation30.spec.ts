import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV = "/dev/generation-experience";
const CONFIG_COUNT = 13;

async function openDev(page: import("@playwright/test").Page, params: string) {
  await page.goto(`${DEV}?${params}`, { waitUntil: "load", timeout: 60000 });
}

test("R4.1 - Activity feed appears when the workflow starts and reflects runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=250&pace=1500");
  await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });

  // Every configured activity renders exactly once — no duplicates.
  const rows = page.locator("[data-activity]");
  await expect(rows).toHaveCount(CONFIG_COUNT, { timeout: 10000 });
  const ids = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-activity")));
  expect(new Set(ids).size).toBe(CONFIG_COUNT);

  // Runtime timestamps appear (real stage durations → age labels).
  await page.waitForFunction(() => document.body.innerText.includes("ago"), { timeout: 30000 });

  await shot(page, "r4-1-activity-feed-appears");
  errors.assertClean();
});

test("R4.2 - Activities activate in runtime order; newest running is active", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=200&pace=1500");
  await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });

  // import_profile completes BEFORE knowledge_intelligence (chronological).
  await page.waitForFunction(
    () => {
      const imp = document.querySelector('[data-activity="import_profile"][data-activity-status="completed"]');
      const know = document.querySelector('[data-activity="knowledge_intelligence"][data-activity-status="completed"]');
      return !!imp && !know;
    },
    { timeout: 30000 },
  );

  // hero completes (composition) while sections_generation is still running (artifact).
  await page.waitForFunction(
    () => {
      const hero = document.querySelector('[data-activity="hero_composition"][data-activity-status="completed"]');
      const sections = document.querySelector('[data-activity="sections_generation"][data-activity-status="running"]');
      return !!hero && !!sections;
    },
    { timeout: 30000 },
  );

  // Exactly one activity is marked active while something runs.
  const active = await page.locator('[data-activity-active="true"]').count();
  expect(active).toBe(1);

  await shot(page, "r4-2-activity-order");
  errors.assertClean();
});

test("R4.3 - Completed activities remain visible and the feed stays in sync with the runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=200&pace=800");
  await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });

  // Monotonic completion — completed rows never regress.
  let prev = -1;
  for (let i = 0; i < 14; i++) {
    const completed = await page.locator('[data-activity-status="completed"]').count();
    expect(completed).toBeGreaterThanOrEqual(prev);
    prev = completed;
    await page.waitForTimeout(900);
  }
  expect(prev).toBeGreaterThan(8);

  // Final success: the terminal activity completes and the feed locks.
  await page.waitForFunction(
    () => document.querySelector('[data-activity="storefront_ready"][data-activity-status="completed"]') !== null,
    { timeout: 30000 },
  );
  const terminalText = await page.locator('[data-activity="storefront_ready"]').innerText();
  expect(terminalText).toContain("Storefront ready");

  await shot(page, "r4-3-activity-complete");
  errors.assertClean();
});

test("R4.4 - Failure freezes the activity history", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "failStage=artifact_generation&speed=250&pace=800");
  await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });
  await page.waitForSelector("[data-activity-failure]", { timeout: 30000 });

  // Completed history preserved; the failed activity highlighted; later ones frozen.
  expect(await page.locator('[data-activity="hero_composition"]').getAttribute("data-activity-status")).toBe("completed");
  expect(await page.locator('[data-activity="sections_generation"]').getAttribute("data-activity-status")).toBe("failed");
  expect(await page.locator('[data-activity="publishing"]').getAttribute("data-activity-status")).toBe("pending");
  expect(await page.locator('[data-activity="storefront_ready"]').getAttribute("data-activity-status")).toBe("pending");

  await shot(page, "r4-4-activity-failure");
  errors.assertClean();
});

test("R4.5 - Reduced motion: activity feed updates instantly, DOM matches runtime", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=200&pace=800");
  await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });

  await page.waitForFunction(
    () => document.querySelector('[data-activity="storefront_ready"][data-activity-status="completed"]') !== null,
    { timeout: 30000 },
  );
  // DOM matches runtime: when the feed shows completion, the experience view does too.
  const progressNow = await page.locator('[data-testid="generation-progress"]').getAttribute("aria-valuenow");
  expect(Number(progressNow)).toBe(100);
  expect(await page.locator("[data-activity]").count()).toBe(CONFIG_COUNT);

  await shot(page, "r4-5-activity-reduced-motion");
  errors.assertClean();
});
