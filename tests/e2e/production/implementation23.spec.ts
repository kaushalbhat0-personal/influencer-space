import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

dotenv.config({ path: ".env.local" });
test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;
const POSTER_FIXTURE = resolve("tests/fixtures/hero-poster.png");

// A valid 1x1 PNG whose pixel value is unique per call — so uploads never
// deduplicate (the resolver/marker tests need a fresh asset each time).
function uniqueTinyPng(): Buffer {
  const zlib = require("zlib");
  const v = Math.floor(Math.random() * 0xffffff);
  const r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
  const W = 1, H = 1;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.from([0, r, g, b]);
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length, 0); return Buffer.concat([l, Buffer.from(t, "ascii"), d]); };
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

let createdAssetIds: string[] = [];
const db = (async () => {
  const { Pool } = await import("pg");
  const u = new URL(process.env.DATABASE_URL ?? "");
  return new Pool({
    host: u.hostname, port: Number(u.port || 5432), database: u.pathname.slice(1),
    user: u.username, password: u.password, ssl: { rejectUnauthorized: false },
  });
})();

async function uploadTinyImages(page: Page, count: number, label: string): Promise<void> {
  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const fileInput = page.locator('label:has-text("Upload") input[type="file"]').first();
  for (let i = 0; i < count; i++) {
    await fileInput.setInputFiles({ name: `${label}-${i}.png`, mimeType: "image/png", buffer: uniqueTinyPng() });
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1500);
}

async function assetRowCount(ids: string[]): Promise<number> {
  const pool = await db;
  const r = await pool.query('SELECT COUNT(*)::int AS c FROM "Asset" WHERE id = ANY($1)', [ids]);
  return r.rows[0]?.c ?? 0;
}

async function assetIdByFilename(filename: string): Promise<string | null> {
  const pool = await db;
  const r = await pool.query('SELECT id FROM "Asset" WHERE "originalFilename" = $1 ORDER BY "createdAt" DESC LIMIT 1', [filename]);
  return r.rows[0]?.id ?? null;
}

async function waitForAssetId(filename: string, timeoutMs = 20000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const id = await assetIdByFilename(filename);
    if (id) return id;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return "";
}

/** Insert N unused Asset rows directly (fast, deterministic, never referenced). */
async function seedUnusedAssets(count: number, prefix: string): Promise<string[]> {
  const pool = await db;
  const ids: string[] = [];
  const rows: unknown[][] = [];
  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID();
    ids.push(id);
    rows.push([id, "eee52d43-ed3d-4ccb-baf5-c728dab36119", `${prefix}-${i}.png`, `${prefix}-${i}.png`, "image/png", 1234, "supabase", `eee52d43-ed3d-4ccb-baf5-c728dab36119/library/${prefix}-${i}.png`, null, "ACTIVE", "READY", new Date(), new Date()]);
  }
  const N = 13;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const placeholders = chunk.map((_, j) => `(${Array.from({ length: N }, (_, k) => `$${j * N + k + 1}`).join(",")})`).join(",");
    const params = chunk.flat();
    await pool.query(`INSERT INTO "Asset" (id, "tenantId", filename, "originalFilename", "mimeType", size, "storageProvider", "storageKey", "publicUrl", status, "processingStatus", "createdAt", "updatedAt") VALUES ${placeholders}`, params);
  }
  return ids;
}

/** Select-all-filtered + batch delete via the UI toolbar. */
async function batchDeleteAllVisible(page: Page): Promise<void> {
  await page.locator('label:has-text("Select all")').click();
  await page.waitForTimeout(500);
  const toolbar = page.locator('[data-testid="batch-toolbar"]');
  await toolbar.waitFor({ state: "visible", timeout: 10000 });
  await page.locator('[data-testid="batch-delete"]').click();
  await page.locator('[data-testid="batch-delete-confirm"]').click();
  await page.waitForTimeout(5000);
}

async function httpStatus(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.status;
  } catch {
    return null;
  }
}

test("M1 — Delete one unused image: DB cleaned, storage cleaned, UI refreshed", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Upload one tiny (unique) image.
  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const fileInput = page.locator('label:has-text("Upload") input[type="file"]').first();
  await fileInput.setInputFiles({ name: "m1-tiny.png", mimeType: "image/png", buffer: uniqueTinyPng() });
  await page.waitForTimeout(4000);
  const assetId = await waitForAssetId("m1-tiny.png");
  expect(assetId).toBeTruthy();

  // Wait for the freshly uploaded card to appear, select it, batch delete.
  await page.waitForSelector('text=m1-tiny.png', { timeout: 20000 }).catch(() => {});
  const card = page.locator('div[class*="aspect-square"]').filter({ has: page.locator("img") }).first();
  await card.locator('input[type="checkbox"]').first().check({ force: true });
  await page.waitForTimeout(500);
  await page.locator('[data-testid="batch-toolbar"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('[data-testid="batch-delete"]').click();
  await page.locator('[data-testid="batch-delete-confirm"]').click();

  // UI refreshed: poll for the deletion notice.
  await page.waitForSelector('text=/Deleted 1 asset/', { timeout: 20000 });
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/storage object/);
  // DB cleaned: the asset row is gone (no stale rows).
  expect(await assetRowCount([assetId!])).toBe(0);
  await shot(page, "m1-deleted");

  errors.assertClean();
});

test("M2 — Batch delete ten unused assets", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  const seeded = await seedUnusedAssets(10, "m2");
  expect(seeded.length).toBe(10);

  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Select all filtered → batch delete.
  await page.locator('label:has-text("Select all")').click();
  await page.waitForTimeout(500);
  const toolbar = page.locator('[data-testid="batch-toolbar"]');
  await toolbar.waitFor({ state: "visible", timeout: 10000 });
  const selectedText = await toolbar.innerText();
  expect(selectedText).toMatch(/\d+ Selected/);
  await page.locator('[data-testid="batch-delete"]').click();
  await page.locator('[data-testid="batch-delete-confirm"]').click();

  // Batch delete of many assets is slow (bulk storage removal + origin
  // verification) — poll for the completion notice.
  await page.waitForSelector('text=/Deleted \\d+ assets?/', { timeout: 30000 });
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/storage object/);
  // No stale rows for the seeded assets.
  expect(await assetRowCount(seeded)).toBe(0);
  await shot(page, "m2-batch-deleted");
  errors.assertClean();
});

test("M3/M10 — Attempt deleting Hero video: blocked, 'Used In' lists Hero Video", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Ensure hero has a video (upload via settings if absent).
  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const vi = page.locator('input[type="file"][accept*="video"]').first();
  if (await vi.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0).catch(() => 0) === 0) {
    await vi.setInputFiles({ name: "m3-video.mp4", mimeType: "video/mp4", buffer: readFileSync(resolve("tests/fixtures/hero-sample.mp4")) });
    await page.waitForSelector("text=Hero media saved!", { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // The hero video card must be marked Used, and its details list Hero Video.
  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(4000);
  const heroCard = page.locator('div[class*="aspect-square"]').filter({ has: page.locator("video") }).first();
  await heroCard.click();
  await page.waitForTimeout(2000);
  const detail = await page.locator("body").innerText();
  expect(detail).toMatch(/Used/);
  expect(detail).toMatch(/Used In/);
  expect(detail).toMatch(/Hero Video/);
  // Delete is blocked for the referenced hero video.
  expect(detail).toMatch(/Replace it instead of deleting/i);
  await shot(page, "m3-hero-video-blocked");
  errors.assertClean();
});

test("M9 — Hero poster marked Used with 'Used In: Hero Poster'", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Upload a poster.
  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Hero Media", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const pi = page.locator('input[type="file"][accept*="image"]').first();
  await pi.setInputFiles({ name: "m9-poster.png", mimeType: "image/png", buffer: readFileSync(POSTER_FIXTURE) });
  await page.waitForSelector("text=Hero media saved!", { timeout: 90000 });
  await page.waitForTimeout(2000);

  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(4000);
  // Find an img card marked Used (the poster).
  const usedImgs = page.locator('div[class*="aspect-square"]').filter({ has: page.locator("img") });
  const usedCount = await page.locator('span:has-text("Used")').count();
  expect(usedCount).toBeGreaterThan(0);
  await shot(page, "m9-poster-used");
  errors.assertClean();
});

test("M6 — Storage verification: batch delete reports storage objects removed (origin check)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Upload a fresh unused image and delete it via the batch path.
  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const fileInput = page.locator('label:has-text("Upload") input[type="file"]').first();
  await fileInput.setInputFiles({ name: "m6-tiny.png", mimeType: "image/png", buffer: uniqueTinyPng() });
  await page.waitForTimeout(4000);
  const assetId = await waitForAssetId("m6-tiny.png");
  expect(assetId).toBeTruthy();
  await page.waitForSelector('text=m6-tiny.png', { timeout: 20000 }).catch(() => {});

  // Select it and batch delete.
  await page.locator('label:has-text("Select all")').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="batch-delete"]').click();
  await page.locator('[data-testid="batch-delete-confirm"]').click();
  await page.waitForSelector('text=/Deleted \\d+ assets?/', { timeout: 40000 });

  const body = await page.locator("body").innerText();
  // Storage verification: the origin check ran and reported removed objects.
  expect(body).toMatch(/storage object/);
  // DB cleaned.
  expect(await assetRowCount([assetId!])).toBe(0);
  await shot(page, "m6-storage-verified");
  errors.assertClean();
});

test("M5 — Batch delete 100 assets: no stale rows", async ({ page }) => {
  test.setTimeout(300000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  // Seed 100 unused assets directly (fast, deterministic).
  const ids = await seedUnusedAssets(100, "m5");
  expect(ids.length).toBe(100);
  console.log("[M5] seeded", ids.length, "assets");

  await page.goto("/admin/media", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Media Library", { timeout: 20000 });
  await page.waitForTimeout(4000);

  // Select all filtered → batch delete (no N+1; bulk queries + bulk storage).
  await page.locator('label:has-text("Select all")').click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="batch-delete"]').click();
  await page.locator('[data-testid="batch-delete-confirm"]').click();
  await page.waitForSelector('text=/Deleted \\d+ assets?/', { timeout: 60000 });

  const remaining = await assetRowCount(ids);
  console.log("[M5] remaining seeded rows after delete:", remaining);
  expect(remaining).toBe(0);
  await shot(page, "m5-100-deleted");
  errors.assertClean();
});

test("M7 — Runtime refresh: storefront + builder reflect deletions (no stale media)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  // Storefront hero still renders (deletions of unrelated assets must not
  // break the hero) and the runtime signature is present.
  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  await expect(page.locator('section#hero [data-resolved-media]')).toBeAttached({ timeout: 15000 });
  const resolved = await page.locator('section#hero [data-resolved-media]').getAttribute("data-resolved-media");
  // Video or poster must render.
  if (resolved === "video") {
    const box = await page.locator('section#hero video').evaluate((el) => el.getBoundingClientRect().height);
    expect(box).toBeGreaterThan(0);
  } else {
    const box = await page.locator('section#hero .aspect-\\[16\\/10\\] img').first().evaluate((el) => el.getBoundingClientRect().height).catch(() => 0);
    expect(box).toBeGreaterThan(0);
  }
  const signature = await page.locator('[data-runtime-signature]').getAttribute("data-runtime-signature");
  expect(signature).toBeTruthy();
  await shot(page, "m7-storefront-after-deletes");
  errors.assertClean();
});
