import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const DEV = "/dev/generation-experience";

async function openProbe(page: import("@playwright/test").Page, url: string) {
  await page.goto(`${DEV}?profileUrl=${encodeURIComponent(url)}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector('[data-testid="acquisition-result"]', { timeout: 20000 });
}

test("R5.1 - YouTube acquisition still resolves richly (regression + enrichment)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // A well-known YouTube handle. Acquisition should populate real profile fields.
  await openProbe(page, "https://www.youtube.com/@MrBeast");

  await page.waitForSelector('[data-testid="acq-platform"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="acq-platform"]').innerText()).toBe("youtube");
  expect(await page.locator('[data-testid="acq-adapter"]').innerText()).toBe("youtube-data-api");

  const populated = await page.locator('[data-testid="acq-populated"]').innerText();
  expect(populated).toContain("displayName");
  expect(populated).toContain("followers");

  // The persona/confidence pipeline ran unchanged on the normalized source.
  const persona = await page.locator('[data-testid="acq-persona"]').innerText();
  expect(persona.length).toBeGreaterThan(0);

  await shot(page, "r5-1-youtube-acquisition");
  errors.assertClean();
});

test("R5.2 - Instagram URL normalizes without fabricating data", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://instagram.com/cristiano");

  await page.waitForSelector('[data-testid="acq-platform"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="acq-platform"]').innerText()).toBe("instagram");
  expect(await page.locator('[data-testid="acq-adapter"]').innerText()).toBe("manual");

  // No fabricated data: populated fields are only links (the URL itself).
  const populated = await page.locator('[data-testid="acq-populated"]').innerText();
  expect(populated).not.toContain("bio");
  expect(populated).not.toContain("followers");
  expect(populated).toContain("links");

  // Capability-supported but unavailable fields are reported as missing (honest).
  const missing = await page.locator('[data-testid="acq-missing"]').innerText();
  expect(missing).toContain("website");

  await shot(page, "r5-2-instagram-fallback");
  errors.assertClean();
});

test("R5.3 - Unsupported platforms stay empty and graceful (TikTok)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://tiktok.com/@someone");

  await page.waitForSelector('[data-testid="acq-platform"]', { timeout: 30000 });
  expect(await page.locator('[data-testid="acq-platform"]').innerText()).toBe("tiktok");
  const populated = await page.locator('[data-testid="acq-populated"]').innerText();
  expect(populated).not.toContain("bio");
  expect(populated).not.toContain("content");
  expect(populated).not.toContain("categories");

  await shot(page, "r5-3-tiktok-fallback");
  errors.assertClean();
});

test("R5.4 - DOM reflects the runtime acquisition diagnostics", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await openProbe(page, "https://www.youtube.com/@MrBeast");

  await page.waitForSelector('[data-testid="acq-platform"]', { timeout: 30000 });
  // Adapter + capability surface reflect the same runtime the KnowledgeBuilder consumes.
  const line = await page.locator('[data-testid="acquisition-line"]').innerText();
  expect(line).toContain("adapter: youtube-data-api");
  // Probe URL input reflects the requested profile.
  expect(await page.locator('input[aria-label="Profile URL"]').inputValue()).toBe("https://www.youtube.com/@MrBeast");

  await shot(page, "r5-4-acquisition-dom");
  errors.assertClean();
});
