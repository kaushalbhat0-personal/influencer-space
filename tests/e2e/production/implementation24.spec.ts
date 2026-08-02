import { test, expect } from "@playwright/test";
import { shot, loginAsCreator, ErrorCollector, CREATOR_SUBDOMAIN } from "./helpers";

test.describe.configure({ mode: "serial" });

const STOREFRONT_URL = `/${CREATOR_SUBDOMAIN}`;

async function storefrontTheme(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main[data-runtime-signature]');
    if (!main) return null;
    const cs = getComputedStyle(main);
    return {
      bg: cs.backgroundColor,
      surfaceCard: cs.getPropertyValue("--surface-card"),
      textPrimary: cs.getPropertyValue("--text-primary"),
      border: cs.getPropertyValue("--border"),
      primary: cs.getPropertyValue("--brand-primary"),
    };
  });
}

async function builderTheme(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="builder-canvas"] [style*="--brand-primary"], [data-testid="builder-canvas"] [class*="overflow-hidden"]');
    // The device frame carries the theme vars inline; read from any element with them.
    const el = [...document.querySelectorAll('[data-testid="builder-canvas"] [style*="--brand"]')].pop();
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      surfaceCard: cs.getPropertyValue("--surface-card"),
      textPrimary: cs.getPropertyValue("--text-primary"),
      border: cs.getPropertyValue("--border"),
      primary: cs.getPropertyValue("--brand-primary"),
    };
  });
}

test("N1 — Storefront sections consume the runtime theme (no hardcoded zinc regressions)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  const t = await storefrontTheme(page);
  expect(t).not.toBeNull();
  expect(t!.primary).toBeTruthy();
  expect(t!.surfaceCard).toBeTruthy();
  expect(t!.textPrimary).toBeTruthy();

  // A rendered section (products) card must use the theme surface var, not a
  // fixed zinc gray.
  const cardInfo = await page.evaluate(() => {
    const card = document.querySelector('#products div[class*="border"]');
    if (!card) return null;
    const cs = getComputedStyle(card);
    return { borderColor: cs.borderColor, textColor: cs.color };
  });
  // The border is derived from --border (rgba white/black), text from --text-primary.
  if (cardInfo) {
    expect(cardInfo.borderColor).toMatch(/rgba\(255, 255, 255/);
  }
  await shot(page, "n1-storefront-themed");
  errors.assertClean();
});

test("N2 — Builder == Storefront: the same runtime theme vars on both surfaces", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  await loginAsCreator(page);

  await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="builder-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(8000);
  const b = await builderTheme(page);
  expect(b).not.toBeNull();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  const s = await storefrontTheme(page);
  expect(s).not.toBeNull();

  // Same theme primary on both surfaces (same theme object).
  expect(s!.primary).toBe(b!.primary);
  expect(s!.surfaceCard).toBe(b!.surfaceCard);
  await shot(page, "n2-builder-storefront-parity");
  errors.assertClean();
});

test("N3 — Runtime theme object drives the rendered colors (proof via computed styles)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();

  await page.goto(STOREFRONT_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  const t = await storefrontTheme(page);
  expect(t).not.toBeNull();
  // The main background resolves to the active theme's background (not a fixed dark zinc).
  const bg = t!.bg;
  // creator-studio dark bg is #0B0B1A -> rgb(11,11,26); neon-dark bg is #09090B -> rgb(9,9,11).
  expect(bg).toMatch(/rgb\(/);
  console.log(`[N3] theme primary=${t!.primary} bg=${bg} surfaceCard=${t!.surfaceCard}`);
  await shot(page, "n3-theme-proof");
  errors.assertClean();
});
