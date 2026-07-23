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

export const test = base.extend<AuthFixtures>({
  superAdminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login?tenant=testcreator");
    await page.waitForLoadState("networkidle");
    await page.fill('input#email', "admin@creatorstore.test");
    await page.fill('input#password', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/super-admin", { timeout: 30000 });
    await use(page);
    await context.close();
  },

  agencyPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input#email', "agency@creatorstore.test");
    await page.fill('input#password', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/agency**", { timeout: 30000 });
    await use(page);
    await context.close();
  },

  creatorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login?tenant=testcreator");
    await page.waitForLoadState("networkidle");
    await page.fill('input#email', "creator@creatorstore.test");
    await page.fill('input#password', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 30000 });
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
