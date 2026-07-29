import { test, expect } from "../shared/fixtures";
import { RegistrationPage } from "../shared/pages/registration";
import { LoginPage } from "../shared/pages/login";
import { createAgencyAccount } from "../shared/accounts";

test.describe("Level 3 — Agency Lifecycle Certification", () => {
  const agency = createAgencyAccount();

  test("Phase 1: Agency registration", async ({ page }) => {
    const registration = new RegistrationPage(page);
    await registration.registerAgency(agency.name, agency.email, agency.password);
    await registration.expectRedirectTo(/\/agency/);
  });

  test("Phase 2: Agency dashboard loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(agency.email, agency.password);
    await expect(page).toHaveURL(/\/agency/);
    await expect(page.locator("text=Agency Dashboard").first()).toBeVisible({ timeout: 10000 });
  });

  test("Phase 3: Agency clients page loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(agency.email, agency.password);
    await page.goto("/agency/clients");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Clients").first()).toBeVisible();
  });

  test("Phase 4: Agency team page loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(agency.email, agency.password);
    await page.goto("/agency/team");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Team").first()).toBeVisible();
  });

  test("Phase 5: Agency billing page loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(agency.email, agency.password);
    await page.goto("/agency/billing");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Billing").first()).toBeVisible();
  });

  test("Phase 6: Agency My Work page loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(agency.email, agency.password);
    await page.goto("/agency/work");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=My Work").first()).toBeVisible();
  });
});
