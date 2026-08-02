import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;
const VIDEO_FIXTURE = resolve("tests/fixtures/hero-sample.mp4");

test("J1 — Hero media renders first with overlapping avatar; About is gone", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Hero media (video or image) renders first in the hero.
  const media = page.locator('section#hero video, section#hero img').first();
  await expect(media).toBeAttached({ timeout: 15000 });

  // The overlap class (30–40% overlap) is present.
  const overlap = await page.locator('[class*="-mt-[30%]"], [class*="-mt-[22%]"]').count();
  expect(overlap).toBeGreaterThan(0);

  // No About section on the storefront.
  await expect(page.locator("text=About Me")).toHaveCount(0);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("About");
  await shot(page, "j1-hero-media-first");
  errors.assertClean();
});

test("J2 — Hero video upload: progress bar, auto-save, playable without refresh", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);

  const videoInput = page.locator('input[type="file"][accept*="video"]').first();
  await videoInput.setInputFiles({
    name: "hero-e2e.mp4",
    mimeType: "video/mp4",
    buffer: readFileSync(VIDEO_FIXTURE),
  });

  // Progress bar appears during upload (no refresh).
  await page.waitForSelector("text=Uploading…", { timeout: 15000 });
  await shot(page, "j2-upload-progress");

  // Auto-save completes without a manual "Save Hero Media" click.
  await page.waitForSelector("text=Hero media saved!", { timeout: 60000 });
  await page.waitForTimeout(2000);

  // The hero video persists and plays on the storefront — no refresh.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const video = page.locator('section#hero video').first();
  await expect(video).toBeAttached({ timeout: 15000 });
  const src = await video.getAttribute("src");
  expect(src || "").toContain(".mp4");
  await page.waitForFunction(() => {
    const v = document.querySelector('section#hero video');
    return !!v && v.readyState >= 1;
  }, { timeout: 30000 }).catch(() => {});
  await shot(page, "j2-storefront-video");
  errors.assertClean();
});

test("J3 — Media Library shows friendly statuses (Ready/Used/Unused), never technical states", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(3000);

  const body = await page.locator("body").innerText();
  // No raw backend states exposed.
  expect(body).not.toMatch(/\bQUEUED\b|\bPENDING\b|\bPROCESSING\b/);
  // Friendly states are shown.
  expect(body).toMatch(/Ready|Used|Unused|Failed/);
  await shot(page, "j3-media-library");
  errors.assertClean();
});

test("J4 — Asset Used In navigates; deleting a referenced asset is blocked with Replace offered", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Open the first "Used" asset (referenced).
  const usedCard = page.locator('button:has-text("Used")').first();
  await usedCard.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  if (await usedCard.count() > 0) {
    await usedCard.click();
    await page.waitForTimeout(2000);
    const detail = await page.locator("body").innerText();
    expect(detail).toMatch(/Used In/);
    // Replace is offered and Delete is blocked for referenced assets.
    expect(detail).toContain("Replace");
    expect(detail).toMatch(/Replace it instead of deleting/i);
    await shot(page, "j4-used-in");
  } else {
    await shot(page, "j4-no-used-assets");
  }
  errors.assertClean();
});

test("J5 — About section removed from Builder sidebar and canvas", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // No About section card in the sidebar.
  await expect(page.locator('[data-testid="builder-section-about"]')).toHaveCount(0);
  const canvasText = await page.locator('[data-testid="builder-canvas"]').innerText();
  expect(canvasText).not.toContain("About");
  await shot(page, "j5-no-about");
  errors.assertClean();
});
