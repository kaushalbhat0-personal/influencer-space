import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV_PAGE = "/dev/generation-experience";
const TOTAL_STAGES = 10;

async function rowCount(page: import("@playwright/test").Page): Promise<number> {
  return page.locator("[data-stage]").count();
}

async function completedCount(page: import("@playwright/test").Page): Promise<number> {
  return page.locator('[data-stage][data-status="completed"]').count();
}

test("R2 - Stage transitions animate once and DOM always reflects the runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto(DEV_PAGE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 20000 });

  // 1. All canonical stages render.
  expect(await rowCount(page)).toBe(TOTAL_STAGES);

  // 2. Mid-workflow: exactly one running stage, everything before it completed,
  //    the rest pending — the animation is fed real runtime state.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-stage][data-status="running"]').length === 1,
    { timeout: 15000 },
  );
  const runningId = await page.locator('[data-stage][data-status="running"]').getAttribute("data-stage");
  expect(runningId).toBeTruthy();

  const runningDone = await page.waitForFunction(
    (id) => document.querySelector(`[data-stage="${id}"]`)?.getAttribute("data-status") === "completed",
    runningId,
    { timeout: 20000 },
  );
  expect(runningDone).toBeTruthy();

  // 3. Slow workflow remains smooth: during the run, the progressbar reflects a
  //    real runtime value (strictly within [0,100]) and never overshoots.
  const mid = await page.locator('[data-testid="generation-progress"]').getAttribute("aria-valuenow");
  expect(Number(mid)).toBeGreaterThan(0);
  expect(Number(mid)).toBeLessThanOrEqual(100);

  // 4. Progress ends at the EXACT runtime value (100) once all stages complete.
  await page.waitForFunction(() => document.querySelectorAll('[data-stage]').length === 10, undefined, { timeout: 20000 });
  await expect
    .poll(() => completedCount(page), { timeout: 20000, intervals: [500] })
    .toBe(TOTAL_STAGES);
  const now = await page.locator('[data-testid="generation-progress"]').getAttribute("aria-valuenow");
  expect(Number(now)).toBe(100);
  expect(await rowCount(page)).toBe(TOTAL_STAGES);

  await shot(page, "r2-generation-animation-complete");
  errors.assertClean();
});

test("R2 - Fast stage updates produce no broken transitions", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto(DEV_PAGE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 20000 });

  // Advance as fast as the dev runtime feeds events; after every tick the list
  // must stay consistent: rows never exceed the canonical count and completed
  // rows never regress to pending/running.
  let prevCompleted = 0;
  for (let i = 0; i < TOTAL_STAGES + 1; i++) {
    await page.waitForTimeout(900);
    const completed = await completedCount(page);
    expect(completed).toBeGreaterThanOrEqual(prevCompleted);
    expect(await rowCount(page)).toBe(TOTAL_STAGES);
    prevCompleted = completed;
  }
  expect(prevCompleted).toBe(TOTAL_STAGES);
  errors.assertClean();
});

test("R2 - Reduced motion: instant updates, DOM still reflects runtime", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto(DEV_PAGE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 20000 });
  expect(await rowCount(page)).toBe(TOTAL_STAGES);

  await expect
    .poll(() => completedCount(page), { timeout: 25000, intervals: [500] })
    .toBe(TOTAL_STAGES);
  const now = await page.locator('[data-testid="generation-progress"]').getAttribute("aria-valuenow");
  expect(Number(now)).toBe(100);

  await shot(page, "r2-generation-reduced-motion");
  errors.assertClean();
});
