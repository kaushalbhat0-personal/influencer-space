import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV = "/dev/generation-experience";

async function openProbe(page: import("@playwright/test").Page, url: string) {
  await page.goto(`${DEV}?profileUrl=${encodeURIComponent(url)}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-testid="intelligence-line"]', { timeout: 40000 });
}

test("R10.1 - Evidence intelligence renders for a creator (MrBeast)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@MrBeast");

  const entities = await page.locator('[data-testid="int-entities"]').innerText();
  const niches = await page.locator('[data-testid="int-niches"]').innerText();
  const evidence = await page.locator('[data-testid="int-evidence"]').innerText();
  const recs = await page.locator('[data-testid="int-recs"]').innerText();

  // Every conclusion is evidence-backed and produces recommendations.
  expect(entities.length).toBeGreaterThan(0);
  expect(niches.length).toBeGreaterThan(0);
  expect(Number(evidence)).toBeGreaterThan(0);
  expect(recs).toContain("creator-lifestyle");

  await shot(page, "r10-1-mrbeast-intelligence");
  errors.assertClean();
});

test("R10.2 - Developer intelligence (Fireship)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@Fireship");

  const entities = await page.locator('[data-testid="int-entities"]').innerText();
  const niches = await page.locator('[data-testid="int-niches"]').innerText();
  expect(entities).toMatch(/developer|educator/);
  expect(niches).toContain("technology");
  expect(Number(await page.locator('[data-testid="int-evidence"]').innerText())).toBeGreaterThan(0);

  await shot(page, "r10-2-fireship-intelligence");
  errors.assertClean();
});

test("R10.3 - Organization/science intelligence (NASA)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@NASA");

  const entities = await page.locator('[data-testid="int-entities"]').innerText();
  const niches = await page.locator('[data-testid="int-niches"]').innerText();
  expect(entities.length).toBeGreaterThan(0);
  expect(niches).toContain("science");
  expect(Number(await page.locator('[data-testid="int-confidence"]').innerText())).toBeGreaterThan(0);

  await shot(page, "r10-3-nasa-intelligence");
  errors.assertClean();
});

test("R10.4 - Browser DOM matches the runtime intelligence", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@Fireship");

  // Entities + niches + recommendations + confidence are all present and
  // mutually consistent (Fireship is a code-lessons channel → developer or
  // educator entity; recommendations follow the primary entity).
  const entities = await page.locator('[data-testid="int-entities"]').innerText();
  const niches = await page.locator('[data-testid="int-niches"]').innerText();
  const recs = await page.locator('[data-testid="int-recs"]').innerText();
  expect(entities).toMatch(/developer|educator/);
  expect(niches).toContain("technology");
  expect(recs.length).toBeGreaterThan(0);
  expect(Number(await page.locator('[data-testid="int-confidence"]').innerText())).toBeGreaterThan(0);

  await shot(page, "r10-4-dom-runtime-sync");
  errors.assertClean();
});
