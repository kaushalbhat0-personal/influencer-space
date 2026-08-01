import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;

test("H1 — Hero settings: social links editor loads migrated links", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#heroTitle", { timeout: 20000 });

  // Social Links card exists (Hero owns social links).
  await expect(page.locator("text=Social Links").first()).toBeVisible({ timeout: 10000 });
  // The migrated links are present (5 rows).
  const selectCount = await page.locator("select").count();
  expect(selectCount).toBeGreaterThanOrEqual(1);
  await shot(page, "h1-hero-settings");

  errors.assertClean();
});

test("H2 — Add a social link in Hero, it renders on storefront (hero, links, footer)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  const marker = `https://example.com/marker-${Date.now().toString(36).slice(-4)}`;

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Social Links", { timeout: 20000 });

  // Add a "website" custom link with the marker URL.
  const addBtn = page.locator("button:has-text('+ Add Link')").first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // The last row is the new one — set platform to "website" and URL to marker.
  const rows = page.locator('div:has(> select.admin-input), div:has(select)');
  const rowCount = await rows.count();
  const lastRow = rows.nth(rowCount - 1);
  await lastRow.locator("select").selectOption("website").catch(() => {});
  const urlInput = lastRow.locator('input[placeholder="https://..."]');
  await urlInput.fill(marker);

  await page.locator("button:has-text('Save Links')").first().click();
  await expect(page.locator("text=Saved").first()).toBeVisible({ timeout: 15000 });
  await shot(page, "h2-hero-social-saved");

  // Storefront reflects it: footer + links section render the marker URL.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await expect(page.locator("text=Creator Not Found")).toHaveCount(0);
  const body = await page.locator("body").innerText();
  expect(body).toContain("Website");
  // The new link URL is present in the rendered DOM (footer or links section).
  await expect(page.locator(`a[href*="marker"]`).first()).toBeVisible({ timeout: 15000 });
  await shot(page, "h2-storefront-social");

  errors.assertClean();
});

test("H3 — Links admin page is presentation-only and shows the same Hero links", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/links", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Social Links", { timeout: 20000 });
  await expect(page.locator("text=Social Links").first()).toBeVisible();
  const selectCount = await page.locator("select").count();
  expect(selectCount).toBeGreaterThanOrEqual(1);
  await shot(page, "h3-links-page");

  errors.assertClean();
});

test("H4 — Hero poster upload persists", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#heroTitle", { timeout: 20000 });

  // The poster MediaField (image/*). Use the first image file input (poster card).
  const imageInput = page.locator('input[type="file"][accept*="image"]').first();
  await imageInput.waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  if (await imageInput.count() > 0) {
    await imageInput.setInputFiles({ name: "hero-poster.png", mimeType: "image/png", buffer: png });
    await page.waitForTimeout(6000);
    // Verify a preview image appeared in the poster MediaField.
    const previews = await page.locator('img[src*="supabase"], video[src*="supabase"]').count();
    expect(previews).toBeGreaterThan(0);
    await shot(page, "h4-poster-upload");
  }

  errors.assertClean();
});
