/**
 * Playwright Auth Fixtures v1.0.0
 *
 * Authenticated test sessions for each role.
 */

import { test as base, type Page } from "@playwright/test";

interface AuthFixtures {
  superAdminPage: Page;
  agencyPage: Page;
  creatorPage: Page;
  guestPage: Page;
}

// Canonical E2E test password (matches tests/fixtures/test-seed.ts).
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "admin123";

export const test = base.extend<AuthFixtures>({
  superAdminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login?tenant=testcreator", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.fill('input#email', "admin@creatorstore.test");
    await page.fill('input#password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/super-admin**", { waitUntil: "commit", timeout: 30000 });
    // UI readiness: h1 visible confirms authenticated shell rendered (no networkidle) — allow cold RSC compile + 62-query context.
    await page.waitForSelector("h1", { timeout: 60000 });
    await use(page);
    await context.close();
  },

  agencyPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.fill('input#email', "agency@creatorstore.test");
    await page.fill('input#password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/agency**", { waitUntil: "commit", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 60000 });
    await use(page);
    await context.close();
  },

  creatorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login?tenant=testcreator", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.fill('input#email', "creator@creatorstore.test");
    await page.fill('input#password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { waitUntil: "commit", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 60000 });
    await use(page);
    await context.close();
  },

  guestPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
