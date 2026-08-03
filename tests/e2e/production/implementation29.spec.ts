import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV = "/dev/generation-experience";

async function sectionCount(page: import("@playwright/test").Page, prefix: string): Promise<number> {
  return page.locator(`[data-construction-section^="${prefix}"]`).count();
}

/** Dev feed starts on mount â€” "load" (not networkidle) keeps the test in sync. */
async function openDev(page: import("@playwright/test").Page, params: string) {
  await page.goto(`${DEV}?${params}`, { waitUntil: "load", timeout: 60000 });
}

test("R3.1 - Construction shell appears and the hero builds itself from a real stage", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // pace holds each running stage so we can observe the shellâ†’hero transition.
  await openDev(page, "speed=250&pace=1500");
  await page.waitForSelector('[data-testid="construction-preview"]', { timeout: 20000 });

  // Shell/skeleton before the hero stage completes.
  await page.waitForFunction(() => document.querySelectorAll('[data-skeleton="hero"]').length > 0, { timeout: 15000 });
  expect(await sectionCount(page, "hero")).toBe(0);

  // Composition completes â†’ the REAL hero section (with resolved runtime media) appears.
  await page.waitForFunction(() => document.querySelectorAll('[data-construction-section^="hero."]').length > 0, {
    timeout: 30000,
  });
  const hero = page.locator('[data-construction-section^="hero."]').first();
  expect(await hero.getAttribute("data-status")).toBe("completed");
  const hasMedia = (await hero.locator("img[src], video").count()) > 0 || (await hero.innerText()).trim().length > 0;
  expect(hasMedia).toBe(true);

  // Theme flips on once the theme stage (composition) completes.
  await expect
    .poll(() => page.locator('[data-testid="construction-preview"]').getAttribute("data-theme-eligible"), {
      timeout: 30000,
      intervals: [400],
    })
    .toBe("true");

  await shot(page, "r3-1-construction-hero");
  errors.assertClean();
});

test("R3.2 - Sections appear ONLY after their workflow stages; DOM matches runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=200&pace=1500");
  await page.waitForSelector('[data-testid="construction-preview"]', { timeout: 20000 });

  // Nav (experience_planning) appears BEFORE hero (composition).
  await page.waitForFunction(() => {
    const nav = document.querySelector('[data-construction-step="nav"][data-status="completed"]');
    const hero = document.querySelector('[data-construction-section^="hero."]');
    return !!nav && !hero;
  }, { timeout: 30000 });

  // Hero appears BEFORE products (artifact_generation).
  await page.waitForFunction(() => {
    const hero = document.querySelector('[data-construction-section^="hero."]');
    const products = document.querySelector('[data-construction-section^="products."]');
    return !!hero && !products;
  }, { timeout: 30000 });

  // artifact_generation completes â†’ products, services, testimonials, faq appear.
  await page.waitForFunction(() => document.querySelectorAll('[data-construction-section^="products."]').length > 0, {
    timeout: 30000,
  });
  for (const prefix of ["services.", "testimonials.", "faq."]) {
    await page.waitForFunction(
      (p) => document.querySelectorAll(`[data-construction-section^="${p}"]`).length > 0,
      prefix,
      { timeout: 20000 },
    );
  }

  // publishing completes â†’ footer appears and construction completes.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-construction-chip="footer"][class*="emerald"]').length > 0,
    { timeout: 30000 },
  );

  // DOM matches runtime: theme applied, multiple sections built.
  expect(await page.locator('[data-testid="construction-preview"]').getAttribute("data-theme-eligible")).toBe("true");
  expect(await page.locator('[data-construction-section]').count()).toBeGreaterThan(3);

  await shot(page, "r3-2-construction-complete");
  errors.assertClean();
});

test("R3.3 - Failure freezes construction; completed sections are preserved", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Fail artifact_generation â€” everything before it stays completed.
  await openDev(page, "failStage=artifact_generation&speed=250&pace=800");
  await page.waitForSelector('[data-testid="construction-preview"]', { timeout: 20000 });

  await page.waitForSelector('[data-construction-failure]', { timeout: 30000 });

  // Hero (composition) remains completed â€” construction is frozen, not rolled back.
  await page.waitForFunction(() => document.querySelectorAll('[data-construction-section^="hero."]').length > 0, {
    timeout: 30000,
  });
  expect(await page.locator('[data-construction-section^="hero."]').first().getAttribute("data-status")).toBe("completed");
  // Products were never built (their stage failed).
  expect(await sectionCount(page, "products")).toBe(0);
  // Theme stayed applied from composition.
  expect(await page.locator('[data-testid="construction-preview"]').getAttribute("data-theme-eligible")).toBe("true");

  await shot(page, "r3-3-construction-failure");
  errors.assertClean();
});

test("R3.4 - Reduced motion: construction still updates instantly", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openDev(page, "speed=200&pace=800");
  await page.waitForSelector('[data-testid="construction-preview"]', { timeout: 20000 });

  await page.waitForFunction(() => document.querySelectorAll('[data-construction-section^="hero."]').length > 0, {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-construction-chip="footer"][class*="emerald"]').length > 0,
    { timeout: 30000 },
  );
  expect(await page.locator('[data-construction-section]').count()).toBeGreaterThan(3);

  await shot(page, "r3-4-construction-reduced-motion");
  errors.assertClean();
});

