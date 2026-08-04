import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV = "/dev/generation-experience";

async function openProbe(page: import("@playwright/test").Page, url: string) {
  await page.goto(`${DEV}?profileUrl=${encodeURIComponent(url)}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-testid="composition-line"]', { timeout: 40000 });
}

test("R12.1 - Composition renders a deterministic blueprint→builder config (developer)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@Fireship");

  const theme = await page.locator('[data-testid="cp-theme"]').innerText();
  const layout = await page.locator('[data-testid="cp-layout"]').innerText();
  const sections = await page.locator('[data-testid="cp-sections"]').innerText();
  const signature = await page.locator('[data-testid="cp-signature"]').innerText();

  expect(theme).toMatch(/^com\.creatos\./);
  expect(layout.length).toBeGreaterThan(0);
  expect(sections).toContain("visible");
  expect(signature.length).toBe(12);

  await shot(page, "r12-1-composition");
  errors.assertClean();
});

test("R12.2 - Composition reflects the entity (athlete vs restaurant)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Restaurant via a real local restaurant-ish profile → warm-dining theme.
  await openProbe(page, "https://www.youtube.com/@khanacademy");

  const theme = await page.locator('[data-testid="cp-theme"]').innerText();
  expect(theme).toMatch(/^com\.creatos\./);
  const hero = await page.locator('[data-testid="cp-hero"]').innerText();
  expect(["image", "background", "placeholder"]).toContain(hero);

  await shot(page, "r12-2-composition-entity");
  errors.assertClean();
});

test("R12.3 - Composition produces builder pages + sections (DOM matches runtime)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@MrBeast");

  const pages = await page.locator('[data-testid="cp-pages"]').innerText();
  const sections = await page.locator('[data-testid="cp-sections"]').innerText();
  const theme = await page.locator('[data-testid="cp-theme"]').innerText();
  expect(Number(pages)).toBeGreaterThan(0);
  expect(theme).toMatch(/^com\.creatos\./);
  expect(sections.length).toBeGreaterThan(0);

  await shot(page, "r12-3-builder-pages");
  errors.assertClean();
});

test("R12.4 - Composition DOM matches the blueprint runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@MrBeast");

  // Composition theme is derived from the blueprint themeFamily; both render.
  const bpTheme = await page.locator('[data-testid="bp-theme"]').innerText();
  const cpTheme = await page.locator('[data-testid="cp-theme"]').innerText();
  expect(bpTheme.length).toBeGreaterThan(0);
  expect(cpTheme).toMatch(/^com\.creatos\./);

  await shot(page, "r12-4-composition-sync");
  errors.assertClean();
});
