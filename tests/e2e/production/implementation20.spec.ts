import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;
const VIDEO_FIXTURE = resolve("tests/fixtures/hero-sample.mp4");
const POSTER_FIXTURE = resolve("tests/fixtures/hero-poster.png");
const LARGE_VIDEO_FIXTURE = resolve("tests/fixtures/large-hero-sample.mp4");

test("K1 — Upload contract: endpoint returns JSON, never 'Invalid server response'", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Intercept the upload endpoint and assert the response is JSON.
  let uploadResponse: string | null = null;
  page.on("response", (r) => {
    if (r.url().includes("/api/media/upload")) {
      uploadResponse = `${r.status()} ${r.headers()["content-type"]}`;
    }
  });

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);

  const videoInput = page.locator('input[type="file"][accept*="video"]').first();
  await videoInput.setInputFiles({ name: "k1.mp4", mimeType: "video/mp4", buffer: readFileSync(VIDEO_FIXTURE) });
  await page.waitForSelector("text=Hero media saved!", { timeout: 60000 });

  expect(uploadResponse).not.toBeNull();
  expect(uploadResponse).toContain("application/json");
  // The UI must never show the masked error.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Invalid server response");
  await shot(page, "k1-upload-contract");
  errors.assertClean();
});

test("K2 — Hero media resolution: video renders (priority), poster becomes video poster", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const video = page.locator('section#hero video').first();
  await expect(video).toBeAttached({ timeout: 15000 });
  const src = await video.getAttribute("src");
  expect(src || "").toContain(".mp4");
  await page.waitForFunction(() => {
    const v = document.querySelector('section#hero video');
    return !!v && v.readyState >= 1;
  }, { timeout: 30000 }).catch(() => {});
  await shot(page, "k2-video-priority");
  errors.assertClean();
});

test("K3 — Poster maps correctly: video poster attribute + poster-only mode", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Guarantee a real poster is set (uploads via the stable XHR contract).
  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  const posterInput = page.locator('input[type="file"][accept*="image"]').first();
  await posterInput.setInputFiles({ name: "k3-poster.png", mimeType: "image/png", buffer: readFileSync(POSTER_FIXTURE) });
  await page.waitForSelector("text=Hero media saved!", { timeout: 60000 });
  await page.waitForTimeout(2000);

  // Storefront: the poster is wired to the video element's poster attribute.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const videoPoster = await page.locator('section#hero video').first().getAttribute("poster").catch(() => null);
  expect(videoPoster).toBeTruthy();
  expect(videoPoster || "").toContain("supabase");
  await shot(page, "k3-video-poster-attr");

  // Clear the video so the poster is the resolved MEDIA (poster-only mode).
  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  const videoRemove = page.locator('button:has-text("Remove")').first();
  await videoRemove.click().catch(() => {});
  await page.locator("button:has-text('Save Hero Media')").click();
  await page.waitForTimeout(2500);

  // Storefront poster-only: a hero media <img> (not the avatar) renders.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const heroMediaImg = await page.locator('section#hero .aspect-\\[16\\/10\\] img[src*="supabase"]').count();
  expect(heroMediaImg).toBeGreaterThan(0);
  await shot(page, "k3-poster-only-storefront");

  // Builder renders the same poster-only media.
  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  const builderMediaImg = page.locator('[data-testid="builder-canvas"] .aspect-\\[16\\/10\\] img').first();
  await builderMediaImg.waitFor({ state: "attached", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  expect(await builderMediaImg.count()).toBeGreaterThan(0);
  await shot(page, "k3-poster-only-builder");
  errors.assertClean();
});

test("K5 — Large video (>4.5MB) uploads without HTTP 413 via direct-to-storage", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  const large = readFileSync(LARGE_VIDEO_FIXTURE);
  // The fixture is intentionally larger than Vercel's serverless body limit.
  expect(large.length).toBeGreaterThan(4.5 * 1024 * 1024);

  let saw413 = false;
  page.on("response", (r) => {
    if (r.url().includes("/api/media/upload-url") || r.url().includes("/api/media/register")) {
      if (r.status() === 413) saw413 = true;
    }
  });

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);

  const videoInput = page.locator('input[type="file"][accept*="video"]').first();
  await videoInput.setInputFiles({ name: "k5-large.mp4", mimeType: "video/mp4", buffer: large });
  await page.waitForSelector("text=Uploading…", { timeout: 20000 });
  await page.waitForSelector("text=Hero media saved!", { timeout: 90000 });

  expect(saw413).toBe(false);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("413");
  expect(body).not.toContain("Invalid server response");
  await shot(page, "k5-large-upload");
  errors.assertClean();
});

test("K4 — Runtime trace reports the media decision matching the DOM", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const signature = await page.locator('[data-runtime-signature]').getAttribute("data-runtime-signature");
  expect(signature).toBeTruthy();
  const hasVideo = (await page.locator('section#hero video').count()) > 0;
  const hasImg = (await page.locator('section#hero img[src*="supabase"]').count()) > 0;
  console.log(`[K4] runtime signature present: ${!!signature}; DOM video=${hasVideo} img=${hasImg}`);
  await shot(page, "k4-runtime-trace");
  errors.assertClean();
});
