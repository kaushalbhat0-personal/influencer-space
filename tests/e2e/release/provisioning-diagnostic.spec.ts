import { test, expect } from "@playwright/test";

const SA_EMAIL = process.env.SUPERADMIN_EMAIL ?? "";
const SA_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "";
const YOUTUBE_URL = "https://www.youtube.com/@SamayRainaOfficial";

test.describe("Provisioning Pipeline Diagnostic", () => {
  test("full pipeline trace", async ({ page }) => {
    test.setTimeout(300000);
    const results: Record<string, string> = {};
    const log = (key: string, val: string) => { results[key] = val; console.log(`  ${key}: ${val}`); };

    log("1-login", "starting");
    await page.goto("/admin/login");
    await page.waitForSelector("#password", { timeout: 15000 });
    await page.fill("#email", SA_EMAIL);
    await page.fill("#password", SA_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 20000 });
    log("1-login", "ok");

    // Open provision modal via "Provision Tenant" button
    await page.goto("/super-admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Provision Tenant")');
    await page.waitForTimeout(1500);
    log("2-modal", "opened");
    await page.screenshot({ path: "test-screenshots/diag-modal.png", fullPage: true });

    // Select YouTube source
    const ytButton = page.locator('button:has-text("YouTube")').first();
    await ytButton.click();
    await page.waitForTimeout(500);
    log("3-source", "youtube");

    // Enter URL using the placeholder text selector
    const inputField = page.locator('input[placeholder*="youtube"], input[placeholder*="@channel"]').first();
    const inputExists = await inputField.isVisible().catch(() => false);
    log("4-input-visible", String(inputExists));
    if (inputExists) {
      await inputField.fill(YOUTUBE_URL);
      log("4-url-filled", "ok");
    } else {
      log("4-url-filled", "input-not-found");
      await page.screenshot({ path: "test-screenshots/diag-no-input.png", fullPage: true });
    }

    // Click Analyze
    const analyzeBtn = page.locator('button:has-text("Analyze")');
    if (await analyzeBtn.isVisible().catch(() => false)) {
      await analyzeBtn.click();
      log("5-analyze", "clicked");
    } else {
      log("5-analyze", "button-not-found");
    }

    // Wait for analysis result (Provision Creator button appears)
    await page.waitForTimeout(3000);
    const provisionBtn = page.locator('button:has-text("Provision Creator")').last();
    try {
      await provisionBtn.waitFor({ state: "visible", timeout: 60000 });
      log("6-provision-btn", "visible");
      await page.screenshot({ path: "test-screenshots/diag-provision-ready.png", fullPage: true });
      await provisionBtn.click();
      log("7-provision", "clicked");

      // Wait for result to appear (either success or failure message)
      const resultEl = page.locator("text=Creator provisioned,text=Provision failed,text=Storefront").first();
      try { await resultEl.waitFor({ state: "visible", timeout: 30000 }); } catch { /* timeout ok */ }

      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-screenshots/diag-provision-done.png", fullPage: true });

      // Read result
      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("provisioned") || bodyText.includes("Storefront")) {
        log("7-provision-result", "success");
        const urlMatch = bodyText.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) log("7-storefront-url", urlMatch[0]);
      } else if (bodyText.includes("fail")) {
        log("7-provision-result", "failed");
        const errIndex = bodyText.indexOf("PrismaClientKnownRequestError");
        if (errIndex >= 0) {
          const errDetail = bodyText.substring(errIndex, errIndex + 300);
          log("7-error-detail", errDetail);
        } else {
          log("7-error", "Provision failed (no Prisma detail)");
        }
      } else {
        log("7-provision-result", "unknown");
        log("7-body-preview", bodyText.substring(0, 500));
      }
    } catch {
      log("6-provision-btn", "timeout");
      await page.screenshot({ path: "test-screenshots/diag-provision-timeout.png", fullPage: true });
      const btns = await page.locator("button").allTextContents();
      log("6-visible-buttons", btns.join(", "));
    }

    // Check the super admin dashboard for the new tenant
    await page.goto("/super-admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-screenshots/diag-final-dashboard.png", fullPage: true });
    const dashText = await page.locator("body").innerText();
    log("8-tenant-in-list", dashText.includes("Samay") ? "found" : "not-found");

    // Try to access storefront with various slugs
    const slugs = ["samay-raina", "samayrainaofficial", "samay", "samayraina"];
    for (const slug of slugs) {
      const resp = await page.goto(`/${slug}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("Creator Not Found")) log(`9-slug-${slug}`, "404");
      else if (bodyText.length > 50) { log(`9-slug-${slug}`, `ok (${resp?.status()})`); log("9-working-slug", slug); break; }
      else log(`9-slug-${slug}`, `unknown (${resp?.status()})`);
    }

    console.log("\n=== FINAL RESULTS ===");
    for (const [k, v] of Object.entries(results)) console.log(`  ${k}: ${v}`);
  });
});
