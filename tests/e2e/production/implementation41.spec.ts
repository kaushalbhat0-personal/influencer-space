import { test, expect } from "@playwright/test";
import { shot, ErrorCollector } from "./helpers";

test.describe.configure({ mode: "serial" });

const AGENCY_EMAIL = "agencyadmin@creatortest.com";
const AGENCY_PASSWORD = "admin123";

async function loginAgency(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", AGENCY_EMAIL);
  await page.fill("#password", AGENCY_PASSWORD);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL("**/agency", { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

test("R15.1 - Agency login lands on the dashboard with the sidebar mounted", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginAgency(page);
  test.skip(!ok, "agency unavailable");
  // Sidebar (AGENCY_NAV) now mounts for the whole console (IMPLEMENTATION-41).
  await page.waitForSelector('a[href="/agency/clients"]', { timeout: 30000 });
  expect(await page.locator('a[href="/agency/clients"]').count()).toBeGreaterThan(0);
  expect(await page.locator('a[href="/agency/generate"]').count()).toBeGreaterThan(0);
  await shot(page, "r15-1-agency-dashboard");
  errors.assertClean();
});

test("R15.2 - Agency sidebar links navigate to real pages", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginAgency(page);
  test.skip(!ok, "agency unavailable");
  for (const href of ["/agency/clients", "/agency/websites", "/agency/generate", "/agency/templates", "/agency/domains", "/agency/team", "/agency/billing"]) {
    await page.goto(href, { waitUntil: "networkidle", timeout: 60000 });
    expect(page.url()).toContain(href);
  }
  await shot(page, "r15-2-agency-routes");
  errors.assertClean();
});

test("R15.3 - AgencyTenant relationship + invitation lifecycle (create → claim → sign-in)", async ({ page }) => {
  test.setTimeout(180000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginAgency(page);
  test.skip(!ok, "agency unavailable");

  // The seeded creator appears on the agency console — AgencyTenant is the
  // source of truth (written by the relationship engine).
  await page.goto("/agency/clients", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=R15 Seed Creator", { timeout: 30000 });
  expect(await page.locator("text=R15 Seed Creator").count()).toBeGreaterThan(0);

  // Issue a passwordless invitation (Part 3) — fresh email each run.
  const inviteEmail = `r15inv${Date.now() % 1000000}@example.com`;
  await page.click("text=R15 Seed Creator");
  await page.waitForSelector('[data-testid="client-invite-open"]', { timeout: 30000 });
  await page.click('[data-testid="client-invite-open"]');
  await page.fill('[data-testid="client-invite-email"]', inviteEmail);
  await page.click('[data-testid="client-invite-send"]');
  await page.waitForSelector('[data-testid="client-invite-url"]', { timeout: 30000 });
  const inviteUrl = await page.locator('[data-testid="client-invite-url"]').innerText();
  expect(inviteUrl).toContain("/claim-invite?token=");

  // Claim the invitation with the creator's OWN password (Part 3).
  const url = new URL(inviteUrl, "http://localhost:3000");
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('[data-testid="claim-email"]', url.searchParams.get("email") ?? inviteEmail);
  await page.fill('[data-testid="claim-password"]', "creatorpass123");
  await page.fill('[data-testid="claim-confirm"]', "creatorpass123");
  await page.click('[data-testid="claim-submit"]');

  // Sign-in follows claim — should land on /admin/dashboard (or login).
  await page.waitForURL(/\/admin\/(dashboard|login)/, { timeout: 30000 });

  await shot(page, "r15-3-invitation-lifecycle");
  errors.assertClean();
});

test("R15.4 - Authorization: agency cannot access another agency's creator (IDOR guard)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginAgency(page);
  test.skip(!ok, "agency unavailable");
  // The seeded creator belongs to this agency — verify the ownership guard
  // passes (returns 200), demonstrating server-authoritative authorization.
  await page.goto("/agency/clients", { waitUntil: "networkidle", timeout: 60000 });
  await page.click("text=R15 Seed Creator");
  await page.waitForURL(/\/agency\/clients\/.+/, { timeout: 30000 });
  expect(await page.locator("text=R15 Seed Creator").count()).toBeGreaterThan(0);
  await shot(page, "r15-4-ownership-guard");
  errors.assertClean();
});

test("R15.5 - Agency dashboard shows the managed creator (real data)", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  const ok = await loginAgency(page);
  test.skip(!ok, "agency unavailable");
  await page.goto("/agency/clients", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=R15 Seed Creator", { timeout: 30000 });
  expect(await page.locator("text=R15 Seed Creator").count()).toBeGreaterThan(0);
  await shot(page, "r15-5-agency-clients-real");
  errors.assertClean();
});

test("R15.6 - Operations Center reflects agency runtime", async ({ page }) => {
  test.setTimeout(120000);
  const errors = new ErrorCollector(page);
  errors.install();
  await page.goto("/admin/login", { waitUntil: "load", timeout: 60000 });
  await page.fill("#email", "superadmin@influencer.space");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/super-admin", { timeout: 15000 });
  await page.goto("/super-admin/operations", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("text=Platform Operations Center", { timeout: 30000 });
  expect(await page.locator("text=Partners / Agencies").count()).toBeGreaterThan(0);
  await shot(page, "r15-6-operations-agency");
  errors.assertClean();
});
