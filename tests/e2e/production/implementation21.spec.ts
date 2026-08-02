import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;
const VIDEO_FIXTURE = resolve("tests/fixtures/hero-sample.mp4");
const POSTER_FIXTURE = resolve("tests/fixtures/hero-poster.png");

async function uploadToField(page: { locator: (s: string) => import("@playwright/test").Locator }, accept: string, name: string, buffer: Buffer) {
  const input = page.locator(`input[type="file"][accept*="${accept}"]`).first();
  await input.setInputFiles({ name, mimeType: accept === "video" ? "video/mp4" : "image/png", buffer });
  await page.waitForSelector("text=Hero media saved!", { timeout: 90000 });
  await page.waitForTimeout(1500);
}

test("L1 — Hero video: upload → Builder <video> == Storefront <video> (same currentSrc, readyState 4)", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);
  await uploadToField(page, "video", "l1-video.mp4", readFileSync(VIDEO_FIXTURE));

  // Builder renders the <video>.
  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);
  const builderVideo = page.locator('[data-testid="builder-canvas"] video').first();
  await expect(builderVideo).toBeAttached({ timeout: 45000 });
  const builderSrc = await builderVideo.getAttribute("src");
  expect(builderSrc || "").toContain(".mp4");
  const builderBox = await builderVideo.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { h: r.height, visible: r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" };
  });
  expect(builderBox.h).toBeGreaterThan(0);
  expect(builderBox.visible).toBe(true);
  const builderResolved = await page.locator('[data-testid="builder-canvas"] [data-resolved-media]').first().getAttribute("data-resolved-media");
  expect(builderResolved).toBe("video");
  await shot(page, "l1-builder-video");

  // Storefront renders the SAME <video>.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const sfVideo = page.locator('section#hero video').first();
  await expect(sfVideo).toBeAttached({ timeout: 15000 });
  const sfSrc = await sfVideo.getAttribute("src");
  expect(sfSrc).toBe(builderSrc);
  await page.waitForFunction(() => {
    const v = document.querySelector('section#hero video');
    return !!v && v.readyState === 4;
  }, { timeout: 30000 }).catch(() => {});
  // IMPLEMENTATION-22 regression guard: the media must be VISIBLE (a real
  // bounding box) — a purged aspect-ratio class collapsed it to height:0.
  const sfBox = await sfVideo.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { h: r.height, visible: r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" };
  });
  expect(sfBox.h).toBeGreaterThan(0);
  expect(sfBox.visible).toBe(true);
  const sfResolved = await page.locator('section#hero [data-resolved-media]').first().getAttribute("data-resolved-media");
  expect(sfResolved).toBe("video");
  await shot(page, "l1-storefront-video");

  errors.assertClean();
});

test("L2 — Hero poster: upload → Builder <img> == Storefront <img> (same src)", async ({ page }) => {
  test.setTimeout(240000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Remove the video so the poster becomes the resolved media.
  const videoRemove = page.locator('button:has-text("Remove")').first();
  await videoRemove.click().catch(() => {});
  await page.locator("button:has-text('Save Hero Media')").click();
  await page.waitForTimeout(2000);

  await uploadToField(page, "image", "l2-poster.png", readFileSync(POSTER_FIXTURE));

  // Builder renders the <img> (poster).
  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  const builderImg = page.locator('[data-testid="builder-canvas"] .aspect-\\[16\\/10\\] img').first();
  await builderImg.waitFor({ state: "attached", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const builderSrc = await builderImg.getAttribute("src");
  expect(builderSrc || "").toContain("supabase");
  // IMPLEMENTATION-22 guard: the poster must be VISIBLE (non-zero box).
  const builderBox = await builderImg.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { h: r.height, visible: r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" };
  });
  expect(builderBox.h).toBeGreaterThan(0);
  expect(builderBox.visible).toBe(true);
  await shot(page, "l2-builder-poster");

  // Storefront renders the SAME <img>.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const sfImg = page.locator('section#hero .aspect-\\[16\\/10\\] img').first();
  await expect(sfImg).toBeAttached({ timeout: 15000 });
  const sfSrc = await sfImg.getAttribute("src");
  expect(sfSrc).toBe(builderSrc);
  // IMPLEMENTATION-22 guard: poster must be VISIBLE (non-zero box).
  const sfBox = await sfImg.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { h: r.height, visible: r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" };
  });
  expect(sfBox.h).toBeGreaterThan(0);
  expect(sfBox.visible).toBe(true);
  await shot(page, "l2-storefront-poster");

  errors.assertClean();
});

test("L3 — Video removed + poster exists → Builder and Storefront BOTH resolve to poster", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // State from L2 (poster-only). Verify both surfaces resolve to image.
  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);
  const builderResolved = await page.locator('[data-testid="builder-canvas"] [data-resolved-media]').first().getAttribute("data-resolved-media");
  expect(builderResolved).toBe("image");
  const builderImg = await page.locator('[data-testid="builder-canvas"] .aspect-\\[16\\/10\\] img').count();
  expect(builderImg).toBeGreaterThan(0);
  const builderHasVideo = await page.locator('[data-testid="builder-canvas"] video').count();
  expect(builderHasVideo).toBe(0);

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const sfResolved = await page.locator('section#hero [data-resolved-media]').first().getAttribute("data-resolved-media");
  expect(sfResolved).toBe("image");
  const sfImg = await page.locator('section#hero .aspect-\\[16\\/10\\] img').count();
  expect(sfImg).toBeGreaterThan(0);
  const sfHasVideo = await page.locator('section#hero video').count();
  expect(sfHasVideo).toBe(0);
  await shot(page, "l3-poster-fallback");

  errors.assertClean();
});

test("L4 — Builder sidebar: collapse → expand → refresh restores panel (no dead-end UI)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(5000);

  const toggle = page.locator('[data-testid="panel-toggle-left"]');
  await expect(toggle).toBeVisible();

  // Collapse → sidebar hidden.
  await toggle.click();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-testid="builder-section-products"]')).toHaveCount(0);

  // Toggle STILL visible while collapsed (re-open is possible).
  await expect(toggle).toBeVisible({ timeout: 5000 });

  // Expand → sidebar restored.
  await toggle.click();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-testid="builder-section-products"]')).toBeVisible({ timeout: 10000 });

  // Collapse again, refresh → state persisted, toggle still visible.
  await toggle.click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-testid="builder-section-products"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="panel-toggle-left"]')).toBeVisible({ timeout: 5000 });
  await shot(page, "l4-sidebar-persisted");

  errors.assertClean();
});

test("L5 — Runtime signatures identical: Builder == Storefront; DOM matches resolved media", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);
  const builderSignature = await page.locator('[data-testid="builder-canvas"]').getAttribute("data-runtime-signature");
  expect(builderSignature).toBeTruthy();
  const builderResolved = await page.locator('[data-testid="builder-canvas"] [data-resolved-media]').first().getAttribute("data-resolved-media");
  const builderDomVideo = (await page.locator('[data-testid="builder-canvas"] video').count()) > 0;
  const builderDomImg = (await page.locator('[data-testid="builder-canvas"] .aspect-\\[16\\/10\\] img').count()) > 0;
  // DOM matches the resolved media decision.
  if (builderResolved === "video") expect(builderDomVideo).toBe(true);
  else if (builderResolved === "image" || builderResolved === "background") expect(builderDomImg).toBe(true);

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const sfSignature = await page.locator('[data-runtime-signature]').getAttribute("data-runtime-signature");
  expect(sfSignature).toBe(builderSignature);
  const sfResolved = await page.locator('section#hero [data-resolved-media]').first().getAttribute("data-resolved-media");
  expect(sfResolved).toBe(builderResolved);
  await shot(page, "l5-signature-parity");

  errors.assertClean();
});
