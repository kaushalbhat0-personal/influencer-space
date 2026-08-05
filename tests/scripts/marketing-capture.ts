/**
 * Self-contained screenshot capture with seeded test data.
 * Creates users, seeds data, captures screenshots and videos.
 *
 * Run: npx tsx tests/scripts/marketing-capture.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:3000";
const ASSETS = path.resolve(process.cwd(), "docs/marketing-assets");
const SCREENSHOTS = path.join(ASSETS, "screenshots");
const VIDEOS = path.join(ASSETS, "videos");

fs.mkdirSync(SCREENSHOTS, { recursive: true });
fs.mkdirSync(VIDEOS, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function apiPost(url: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function capture(page: ReturnType<typeof chromium> extends { launch(): Promise<infer B> } ? never : never, name: string) {
  const file = path.join(SCREENSHOTS, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: name.includes("storefront") || name.includes("homepage") || name.includes("pricing") });
  console.log(`  ✓ ${name}`);
}

async function loginCapture(
  name: string, url: string, email: string, password: string,
  opts?: { video?: boolean }
) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: DESKTOP,
    colorScheme: "dark",
    ...(opts?.video ? { recordVideo: { dir: VIDEOS, size: DESKTOP } } : {}),
  });
  const page = await context.newPage();

  try {
    // Login
    await page.goto(`${BASE}/admin/login`, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes("login") || currentUrl.includes("error")) {
      console.log(`  ⚠ Login may have failed for ${email} (url: ${currentUrl.substring(0, 60)})`);
    }

    // Navigate to target page
    await page.goto(url, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await capture(page, name);
    return true;
  } catch (e) {
    console.error(`  ✗ ${name}: ${String(e).substring(0, 80)}`);
    return false;
  } finally {
    if (opts?.video) {
      await context.close();
      await page.video()?.saveAs(path.join(VIDEOS, name.replace(".png", ".webm")));
    }
    await context.close();
    await browser.close();
  }
}

async function main() {
  console.log("🎬 CreatorStore Marketing Capture\n");

  // 1. Register test users
  console.log("1. Creating test users...");
  const creatorEmail = `capture-creator-${Date.now()}@test.com`;
  const creatorPass = "Capture123!";
  await apiPost("/api/auth/register", {
    email: creatorEmail,
    password: creatorPass,
    name: "Demo Creator",
    persona: "creator",
    planCode: "creator_launch",
  });
  console.log(`  Created creator: ${creatorEmail}`);

  // 2. Seed test products
  console.log("  Seeding test data via API...");
  try {
    await apiPost("/api/seed/demo", { email: creatorEmail });
  } catch { /* seed may not exist */ }

  // 3. Public pages (no auth)
  console.log("\n2. Public pages...");
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: DESKTOP, colorScheme: "dark", recordVideo: { dir: VIDEOS, size: DESKTOP } });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/`, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await capture(page, "marketing/01-homepage-desktop.png");
    await page.setViewportSize(MOBILE);
    await page.goto(`${BASE}/`, { timeout: 30000, waitUntil: "networkidle" });
    await capture(page, "marketing/02-homepage-mobile.png");

    await page.setViewportSize(DESKTOP);
    await page.goto(`${BASE}/pricing`, { timeout: 30000, waitUntil: "networkidle" });
    await capture(page, "marketing/03-pricing-desktop.png");

    await ctx.close();
    await page.video()?.saveAs(path.join(VIDEOS, "marketing-homepage.webm"));
    await browser.close();
  }

  // 4. Storefront (seeded tenant: snax)
  console.log("\n3. Storefront...");
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: DESKTOP, colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/snax`, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await capture(page, "storefront/01-desktop.png");
    await page.setViewportSize(MOBILE);
    await page.goto(`${BASE}/snax`, { timeout: 30000, waitUntil: "networkidle" });
    await capture(page, "storefront/02-mobile.png");
    await ctx.close();
    await browser.close();
  }

  // 5. Creator admin pages
  console.log("\n4. Creator admin...");
  await loginCapture("creator/01-dashboard.png", `${BASE}/admin/dashboard`, creatorEmail, creatorPass);
  await loginCapture("creator/02-themes.png", `${BASE}/admin/themes`, creatorEmail, creatorPass);
  await loginCapture("creator/03-billing.png", `${BASE}/admin/billing`, creatorEmail, creatorPass);
  await loginCapture("creator/04-bookings.png", `${BASE}/admin/bookings`, creatorEmail, creatorPass);
  await loginCapture("creator/05-products.png", `${BASE}/admin/products`, creatorEmail, creatorPass);
  await loginCapture("creator/06-analytics.png", `${BASE}/admin/analytics`, creatorEmail, creatorPass);
  await loginCapture("creator/07-domain.png", `${BASE}/admin/settings/domain`, creatorEmail, creatorPass);

  // 6. Partner pages
  console.log("\n5. Partner...");
  await loginCapture("partner/01-dashboard.png", `${BASE}/agency`, "agency@creatorstore.test", "TestPass123!");
  await loginCapture("partner/02-clients.png", `${BASE}/agency/clients`, "agency@creatorstore.test", "TestPass123!");
  await loginCapture("partner/03-billing.png", `${BASE}/agency/billing`, "agency@creatorstore.test", "TestPass123!");

  // 7. Super Admin pages
  console.log("\n6. Super Admin...");
  await loginCapture("superadmin/01-dashboard.png", `${BASE}/super-admin`, "admin@creatorstore.test", "TestPass123!");
  await loginCapture("superadmin/02-finance.png", `${BASE}/super-admin/finance`, "admin@creatorstore.test", "TestPass123!");
  await loginCapture("superadmin/03-settlements.png", `${BASE}/super-admin/settlements`, "admin@creatorstore.test", "TestPass123!");
  await loginCapture("superadmin/04-domains.png", `${BASE}/super-admin/domains`, "admin@creatorstore.test", "TestPass123!");
  await loginCapture("superadmin/05-revenue.png", `${BASE}/super-admin/revenue`, "admin@creatorstore.test", "TestPass123!");

  // 8. Video capture of onboarding flow
  console.log("\n7. Video: Creator signup → dashboard...");
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: DESKTOP, colorScheme: "dark", recordVideo: { dir: VIDEOS, size: DESKTOP } });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/signup`, { timeout: 30000, waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.click('text=Continue');
    await page.waitForTimeout(500);
    // Select persona
    await page.click('text=Creator');
    await page.waitForTimeout(500);
    // Select plan
    await page.click('text=Creator Launch');
    await page.waitForTimeout(500);
    await page.click('text=Continue');
    await page.waitForTimeout(500);
    // Account form
    const vidEmail = `capture-video-${Date.now()}@test.com`;
    await page.fill('input#name', "Demo Creator");
    await page.fill('input#email', vidEmail);
    await page.fill('input#password', "Capture123!");
    await page.waitForTimeout(500);
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(5000);
    await capture(page, "creator/08-onboarding.png");

    await ctx.close();
    const vp = page.video();
    if (vp) await vp.saveAs(path.join(VIDEOS, "creator-signup.webm"));
    await browser.close();
  }

  // List all generated files
  console.log("\n✅ Done! Generated files:");
  function listFiles(dir: string, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      else console.log(`  ${prefix}${entry.name}`);
    }
  }
  listFiles(ASSETS);
}

main().catch(console.error);
