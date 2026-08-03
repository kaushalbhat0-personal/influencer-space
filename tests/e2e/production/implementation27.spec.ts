import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

test("R1 - Generation experience renders stages from the runtime-driven model (dev visualization)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/dev/generation-experience", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 20000 });

  // The canonical 10 stages render from GENERATION_STAGES.
  const stages = page.locator('[data-stage]');
  await expect(stages).toHaveCount(10, { timeout: 10000 });

  // As runtime events advance, completed stages flip to completed status.
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('[data-stage]')];
    return rows.some((r) => r.getAttribute("data-status") === "completed");
  }, { timeout: 15000 });
  const completed = await page.locator('[data-stage][data-status="completed"]').count();
  expect(completed).toBeGreaterThan(0);

  // Progress bar reflects the runtime (real value, no fake hardcoding).
  const ariaNow = await page.locator('[data-testid="generation-progress"]').getAttribute("aria-valuenow");
  expect(Number(ariaNow)).toBeGreaterThan(0);
  await shot(page, "r1-generation-experience");
  errors.assertClean();
});
