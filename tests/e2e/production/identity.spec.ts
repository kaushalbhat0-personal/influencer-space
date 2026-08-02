import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;

test("I1 — Profile page is Account Settings only (no identity fields)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/profile", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Account Settings", { timeout: 20000 });
  // No storefront identity fields may be edited here.
  await expect(page.locator("text=Profile Photo")).toHaveCount(0);
  await expect(page.locator("text=Social Links").first()).toHaveCount(0);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Manage your public creator profile");
  await shot(page, "i1-account-settings");

  errors.assertClean();
});

test("I2 — Hero settings owns Creator Identity (name, profile picture, bio)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#creatorName", { timeout: 20000 });
  await expect(page.locator("text=Creator Identity").first()).toBeVisible();
  await shot(page, "i2-creator-identity");

  errors.assertClean();
});

test("I4 — Builder loads the same hero media (video or poster) as the storefront", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);

  // The builder must render SOME hero media (video when present, else poster).
  const builderVideo = page.locator('[data-testid="builder-canvas"] video').first();
  const builderImg = page.locator('[data-testid="builder-canvas"] .aspect-\\[16\\/10\\] img').first();
  const builderHasVideo = (await builderVideo.count()) > 0;
  const builderHasImg = (await builderImg.count()) > 0;
  expect(builderHasVideo || builderHasImg).toBe(true);
  const builderSrc = builderHasVideo
    ? await builderVideo.getAttribute("src")
    : await builderImg.getAttribute("src");
  expect(builderSrc || "").toContain("supabase");
  await shot(page, "i4-builder-media");

  // Same resolved media on the storefront — builder == storefront parity.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const sfVideo = page.locator('section#hero video').first();
  const sfImg = page.locator('section#hero .aspect-\\[16\\/10\\] img').first();
  const sfHasVideo = (await sfVideo.count()) > 0;
  const sfHasImg = (await sfImg.count()) > 0;
  expect(sfHasVideo || sfHasImg).toBe(true);
  const sfSrc = sfHasVideo
    ? await sfVideo.getAttribute("src")
    : await sfImg.getAttribute("src");
  expect(sfSrc || "").toContain("supabase");
  // Same media kind + same source URL on both surfaces.
  expect(sfHasVideo).toBe(builderHasVideo);
  expect(sfSrc).toBe(builderSrc);

  errors.assertClean();
});

test("I3 — Storefront hero renders Hero-owned name and overlapping profile picture", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await expect(page.locator("text=Creator Not Found")).toHaveCount(0);

  const body = await page.locator("body").innerText();
  // Hero-owned name is rendered as the H1.
  expect(body).toContain("Farah Khan");
  // The overlapping avatar style is present (30–40% overlap, IMPLEMENTATION-19).
  const overlap = await page.locator('[class*="-mt-[30%]"], [class*="-mt-[22%]"]').count();
  expect(overlap).toBeGreaterThan(0);
  // A profile image renders in the hero.
  const avatarImg = await page.locator('section#hero img[src*="supabase"]').count();
  expect(avatarImg).toBeGreaterThan(0);
  await shot(page, "i3-hero-layout");

  errors.assertClean();
});
