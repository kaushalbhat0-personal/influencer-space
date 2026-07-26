import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage, SEED_CREATOR } from "../pages/AuthPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { DashboardPage } from "../pages/DashboardPage";
import { CreatorAdminPage } from "../pages/CreatorAdminPage";
import { BuilderPage } from "../pages/BuilderPage";
import { StorefrontPage } from "../pages/StorefrontPage";
import { createDiagnosticContext, DiagnosticContext } from "../helpers/diagnostics";
import type { SmokeCreator } from "./test-creators";
import { runCleanup, CleanupResult } from "../helpers/cleanup";
import type { StepResult, CreatorTestReportEntry } from "../helpers/report";

export interface SmokeFixtures {
  landingPage: LandingPage;
  authPage: AuthPage;
  onboardingPage: OnboardingPage;
  dashboardPage: DashboardPage;
  creatorAdminPage: CreatorAdminPage;
  builderPage: BuilderPage;
  storefrontPage: StorefrontPage;
  diagnosticCtx: DiagnosticContext;
  creatorData: SmokeCreator;
  runStep: (name: string, fn: () => Promise<void>) => Promise<StepResult>;
  cleanup: () => CleanupResult;
  getReportEntry: () => CreatorTestReportEntry;
  authenticatedPage: Page;
}

export const smokeTest = base.extend<SmokeFixtures>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },

  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  creatorAdminPage: async ({ page }, use) => {
    await use(new CreatorAdminPage(page));
  },

  builderPage: async ({ page }, use) => {
    await use(new BuilderPage(page));
  },

  storefrontPage: async ({ page }, use) => {
    await use(new StorefrontPage(page));
  },

  diagnosticCtx: async ({ page }, use, testInfo) => {
    const ctx = createDiagnosticContext(page, testInfo, "");
    await use(ctx);
  },

  creatorData: async ({}, use) => {
    await use({} as SmokeCreator);
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const auth = new AuthPage(page);
    await auth.login(SEED_CREATOR);
    const loggedIn = await auth.isLoggedIn();
    if (!loggedIn) {
      console.warn("[Fixture] Could not log in as seeded creator. Continuing anyway.");
    }
    await use(page);
    await context.close();
  },

  cleanup: async ({}, use) => {
    await use(() => runCleanup());
  },

  runStep: async ({}, use) => {
    await use(async (name: string, fn: () => Promise<void>): Promise<StepResult> => {
      const start = Date.now();
      try {
        await fn();
        return { name, passed: true, durationMs: Date.now() - start };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { name, passed: false, durationMs: Date.now() - start, error: msg };
      }
    });
  },

  getReportEntry: async ({}, use) => {
    await use(() => {
      throw new Error("Report entry must be built by the test");
    });
  },
});
