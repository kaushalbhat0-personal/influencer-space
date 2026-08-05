/**
 * Standalone Screenshot Capture — Marketing Assets
 * Run: npx tsx tests/scripts/capture-screenshots.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const ASSETS_DIR = path.resolve(process.cwd(), "docs/marketing-assets/screenshots");

const DESKTOP = { width: 1440, height: 900 };

async function capture(name: string, url: string, { fullPage = false, viewport = DESKTOP } = {}) {
  const filepath = path.join(ASSETS_DIR, name);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, colorScheme: "dark" });
  const page = await context.newPage();
  try {
    await page.goto(url, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: filepath, fullPage });
    console.log(`✓ ${name}`);
  } catch (e) { console.error(`✗ ${name}: ${e}`); }
  await context.close();
  await browser.close();
}

async function loginCapture(
  name: string, url: string,
  { email, password, loginUrl }: { email: string; password: string; loginUrl: string }
) {
  const filepath = path.join(ASSETS_DIR, name);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: DESKTOP, colorScheme: "dark" });
  const page = await context.newPage();
  try {
    await page.goto(loginUrl, { timeout: 30000, waitUntil: "networkidle" });
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log(`  Logged in as ${email}, page: ${title}`);

    await page.goto(url, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`✓ ${name}`);
  } catch (e) { console.error(`✗ ${name}: ${e}`); }
  await context.close();
  await browser.close();
}

async function main() {
  console.log("📸 Capturing CreatorStore screenshots...\n");

  // ── Public pages (no auth) ──
  await capture("marketing/01-homepage.png", `${BASE_URL}/`, { fullPage: true });
  await capture("marketing/02-pricing.png", `${BASE_URL}/pricing`, { fullPage: true });
  await capture("marketing/03-homepage-mobile.png", `${BASE_URL}/`, { viewport: { width: 390, height: 844 }, fullPage: true });
  await capture("storefront/01-storefront.png", `${BASE_URL}/snax`, { fullPage: true });
  await capture("storefront/02-storefront-mobile.png", `${BASE_URL}/snax`, { fullPage: true, viewport: { width: 390, height: 844 } });

  // ── Creator pages ──
  await loginCapture("creator/01-dashboard.png", `${BASE_URL}/admin/dashboard`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/02-themes.png", `${BASE_URL}/admin/themes`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/03-billing.png", `${BASE_URL}/admin/billing`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/04-bookings.png", `${BASE_URL}/admin/bookings`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/05-products.png", `${BASE_URL}/admin/products`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/06-analytics.png", `${BASE_URL}/admin/analytics`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("creator/07-domain.png", `${BASE_URL}/admin/settings/domain`, {
    email: "creator@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });

  // ── Partner pages ──
  await loginCapture("partner/01-dashboard.png", `${BASE_URL}/agency`, {
    email: "agency@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("partner/02-clients.png", `${BASE_URL}/agency/clients`, {
    email: "agency@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("partner/03-billing.png", `${BASE_URL}/agency/billing`, {
    email: "agency@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("partner/04-analytics.png", `${BASE_URL}/agency/analytics`, {
    email: "agency@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });

  // ── Super Admin pages ──
  await loginCapture("superadmin/01-dashboard.png", `${BASE_URL}/super-admin`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login` 
  });
  await loginCapture("superadmin/02-finance.png", `${BASE_URL}/super-admin/finance`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("superadmin/03-settlements.png", `${BASE_URL}/super-admin/settlements`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("superadmin/04-ledger.png", `${BASE_URL}/super-admin/partner-ledger`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("superadmin/05-domains.png", `${BASE_URL}/super-admin/domains`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });
  await loginCapture("superadmin/06-revenue.png", `${BASE_URL}/super-admin/revenue`, {
    email: "admin@creatorstore.test", password: "TestPass123!", loginUrl: `${BASE_URL}/admin/login`
  });

  console.log("\n✅ Done! All screenshots saved to docs/marketing-assets/screenshots/");
}

main().catch(console.error);
