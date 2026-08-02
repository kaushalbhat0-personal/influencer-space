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

test("I4 — Builder loads the hero video (same src as storefront)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  const builderVideo = page.locator('[data-testid="builder-canvas"] video').first();
  await builderVideo.waitFor({ state: "attached", timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-testid="builder-canvas"] video');
    return !!v && v.readyState >= 1;
  }, { timeout: 45000 }).catch(() => {});
  const builderSrc = (await builderVideo.getAttribute("src")) || "";
  expect(builderSrc).toContain(".mp4");
  await shot(page, "i4-builder-video");

  // Same resolved src on the storefront.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  const storefrontSrc = (await page.locator("section#hero video").first().getAttribute("src")) || "";
  expect(storefrontSrc).toContain(".mp4");
  expect(storefrontSrc).toBe(builderSrc);

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
  // The overlapping avatar style is present.
  const overlap = await page.locator('[class*="-mt-[18%]"], [class*="-mt-[12%]"]').count();
  expect(overlap).toBeGreaterThan(0);
  // A profile image renders in the hero.
  const avatarImg = await page.locator('section#hero img[src*="supabase"]').count();
  expect(avatarImg).toBeGreaterThan(0);
  await shot(page, "i3-hero-layout");

  errors.assertClean();
});
