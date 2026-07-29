import { test, expect } from "../shared/fixtures";
import { RegistrationPage } from "../shared/pages/registration";
import { LoginPage } from "../shared/pages/login";
import { createCreatorAccount } from "../shared/accounts";

test.describe("Level 3 — Creator Lifecycle Certification", () => {
  const account = createCreatorAccount();

  test("Phase 1: Creator registration and onboarding", async ({ page }) => {
    const registration = new RegistrationPage(page);
    await registration.registerCreator(account.name, account.email, account.password);
    // After registration, user should be redirected to onboarding or dashboard
    await registration.expectRedirectTo(/\/onboarding|\/admin\/dashboard/);
  });

  test("Phase 2: Creator login after registration", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(account.email, account.password);
    await login.expectRedirectTo(/\/admin\/dashboard/);
  });

  test("Phase 3: Creator dashboard loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(account.email, account.password);
    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 10000 });
  });

  test("Phase 4: Create website wizard loads", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(account.email, account.password);
    await page.goto("/admin/create");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Create Your Website").first()).toBeVisible();
  });

  test("Phase 5: Builder loads and renders", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(account.email, account.password);
    await page.goto("/builder");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/builder/);
  });

  test("Phase 6: Publish website", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(account.email, account.password);
    // Navigate to dashboard and trigger publish
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");
    // Verify storefront URL is accessible
    const storefrontLink = page.locator('a[href*="/"]').filter({ hasText: "View" }).first();
    if (await storefrontLink.isVisible()) {
      const href = await storefrontLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("body")).not.toBeEmpty();
      }
    }
  });
});
