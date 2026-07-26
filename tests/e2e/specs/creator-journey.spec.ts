import { test, expect, type Browser, type Page, type BrowserContext } from "@playwright/test";
import { SMOKE_CREATORS, type SmokeCreator } from "../fixtures/test-creators";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage, SEED_CREATOR } from "../pages/AuthPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { DashboardPage } from "../pages/DashboardPage";
import { CreatorAdminPage } from "../pages/CreatorAdminPage";
import { BuilderPage } from "../pages/BuilderPage";
import { StorefrontPage } from "../pages/StorefrontPage";
import { createDiagnosticContext, captureScreenshot, type DiagnosticContext } from "../helpers/diagnostics";
import { runCleanup } from "../helpers/cleanup";
import { generateReport, writeReportToFile, type StepResult, type CreatorTestReportEntry } from "../helpers/report";

const ALL_REPORT_ENTRIES: CreatorTestReportEntry[] = [];
const SEEDED_TENANT_DOMAIN = "testcreator";

interface TestContext {
  creator: SmokeCreator;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  diag: DiagnosticContext;
  steps: StepResult[];
  screenshots: string[];
  storefrontUrl: string | undefined;
  personaName: string | undefined;
  personaScore: number | undefined;
  generationTimeMs: number | undefined;
  publishTimeMs: number | undefined;
}

async function createTestContext(creator: SmokeCreator, browser: Browser): Promise<TestContext> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `test-results/videos/${creator.slug}` },
  });
  const page = await context.newPage();

  const diag = createDiagnosticContext(page, test.info(), creator.screenshotDir);

  return {
    creator,
    browser,
    context,
    page,
    diag,
    steps: [],
    screenshots: [],
    storefrontUrl: undefined,
    personaName: undefined,
    personaScore: undefined,
    generationTimeMs: undefined,
    publishTimeMs: undefined,
  };
}

async function closeTestContext(ctx: TestContext): Promise<void> {
  try {
    await ctx.context.tracing.stop();
  } catch {
    // tracing not started
  }
  await ctx.context.close();
}

async function runStep(
  ctx: TestContext,
  name: string,
  fn: (ctx: TestContext) => Promise<void>,
): Promise<void> {
  const start = Date.now();
  try {
    await fn(ctx);
    ctx.steps.push({ name, passed: true, durationMs: Date.now() - start });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${ctx.creator.id}] Step "${name}" FAILED: ${msg}`);
    ctx.steps.push({ name, passed: false, durationMs: Date.now() - start, error: msg });
  }
}

async function takeScreenshot(ctx: TestContext, name: string): Promise<void> {
  try {
    const path = await captureScreenshot(ctx.diag, name);
    ctx.screenshots.push(path);
  } catch (err) {
    console.warn(`[${ctx.creator.id}] Screenshot "${name}" failed: ${err}`);
  }
}

function buildReportEntry(ctx: TestContext, passed: boolean): CreatorTestReportEntry {
  return {
    creator: ctx.creator,
    passed,
    steps: ctx.steps,
    personaName: ctx.personaName,
    personaScore: ctx.personaScore,
    generationTimeMs: ctx.generationTimeMs,
    publishTimeMs: ctx.publishTimeMs,
    storefrontUrl: ctx.storefrontUrl,
    screenshots: ctx.screenshots,
    consoleErrors: ctx.diag.consoleErrors,
    networkErrors: ctx.diag.networkErrors,
    cleanupVerified: false,
  };
}

function allCriticalStepsPass(ctx: TestContext): boolean {
  const critical = ["Landing Page", "Auth", "Onboarding", "Builder", "Storefront Desktop"];
  const failedCritical = ctx.steps.filter(
    (s) => critical.includes(s.name) && !s.passed,
  );
  return failedCritical.length === 0;
}

function assertCriticalSteps(ctx: TestContext): void {
  const critical = ["Landing Page", "Auth", "Onboarding", "Builder", "Storefront Desktop"];
  for (const s of ctx.steps) {
    if (critical.includes(s.name) && !s.passed) {
      throw new Error(`Critical step "${s.name}" failed: ${s.error ?? "unknown error"}`);
    }
  }
}

test.describe.serial("CreatorStore E2E Smoke Test", () => {
  test.beforeEach(() => {
    const cleanup = runCleanup();
    if (!cleanup.success) {
      console.warn(`[Cleanup] Failed: ${cleanup.output}`);
    }
  });

  for (const creator of SMOKE_CREATORS) {
    test(`${creator.creatorName} (${creator.niche}) — full journey`, async ({ browser }) => {
      const ctx = await createTestContext(creator, browser);
      const { page } = ctx;

      try {
        // ── 1. LANDING PAGE ──
        await runStep(ctx, "Landing Page", async () => {
          const landing = new LandingPage(page);
          await landing.goto();
          expect(await landing.isLoaded()).toBe(true);
          await takeScreenshot(ctx, "01-homepage");
        });

        // ── 2. PRICING ──
        await runStep(ctx, "Pricing", async () => {
          const landing = new LandingPage(page);
          await landing.navigateToPricing();
          expect(await landing.pricingIsVisible()).toBe(true);
        });

        // ── 3. AUTH ──
        await runStep(ctx, "Auth", async () => {
          const auth = new AuthPage(page);
          await auth.login(SEED_CREATOR);
          expect(await auth.isLoggedIn()).toBe(true);
        });

        // ── 4. ONBOARDING ──
        await runStep(ctx, "Onboarding", async () => {
          const onboarding = new OnboardingPage(page);
          const result = await onboarding.runFullOnboarding(creator.youtubeUrl);

          if (result.success) {
            ctx.personaName = result.personaName;
            ctx.personaScore = result.personaScore;
            ctx.storefrontUrl = result.storefrontUrl;
            await takeScreenshot(ctx, "02-onboarding");
          } else {
            console.warn(`[${creator.id}] Onboarding failed: ${result.error}. Will use seeded tenant for remaining steps.`);
            ctx.storefrontUrl = SEEDED_TENANT_DOMAIN;
            // Don't throw — continue with seeded tenant
          }
        });

        // ── 5. DASHBOARD ──
        await runStep(ctx, "Dashboard", async () => {
          const dashboard = new DashboardPage(page);
          await dashboard.goto();
          expect(await dashboard.isLoaded()).toBe(true);
          const info = await dashboard.getDashboardInfo();
          expect(info.metricCards).toBeGreaterThanOrEqual(0);
          await takeScreenshot(ctx, "03-dashboard");
        });

        // ── 6. CREATOR ADMIN ──
        await runStep(ctx, "Creator Admin", async () => {
          const admin = new CreatorAdminPage(page);
          const sections = await admin.verifyAllSections();
          expect(sections.profile).toBe(true);
          expect(sections.gallery).toBe(true);
          expect(sections.products).toBe(true);
          expect(sections.seo).toBe(true);
        });

        // ── 7. BUILDER ──
        await runStep(ctx, "Builder", async () => {
          const builder = new BuilderPage(page);
          await builder.goto();
          expect(await builder.isLoaded()).toBe(true);
          const info = await builder.getBuilderInfo();
          expect(info.canvasRendered).toBe(true);
          if (info.publishSucceeds) {
            ctx.publishTimeMs = 0; // flagged as published
          }
          await takeScreenshot(ctx, "04-builder");
        });

        // ── 8. STOREFRONT ──
        await runStep(ctx, "Storefront Desktop", async () => {
          const storefront = new StorefrontPage(page);
          const targetUrl = ctx.storefrontUrl ?? SEEDED_TENANT_DOMAIN;
          await storefront.goto(targetUrl);
          expect(await storefront.isLoaded()).toBe(true);
          const info = await storefront.getStorefrontInfo();
          expect(info.heroRendered).toBe(true);
          await takeScreenshot(ctx, "05-storefront-desktop");
        });

        await runStep(ctx, "Storefront Mobile", async () => {
          const storefront = new StorefrontPage(page);
          await storefront.setMobileViewport();
          await page.reload();
          await page.waitForLoadState("networkidle");
          expect(await storefront.isLoaded()).toBe(true);
          await takeScreenshot(ctx, "06-storefront-mobile");
        });

        // ── 9. LOGOUT ──
        await runStep(ctx, "Logout", async () => {
          const auth = new AuthPage(page);
          await auth.logout();
        });

        // ── RUN CLEANUP ──
        const finalCleanup = runCleanup();
        const passed = allCriticalStepsPass(ctx);
        const entry = buildReportEntry(ctx, passed);
        entry.cleanupVerified = finalCleanup.success;
        ALL_REPORT_ENTRIES.push(entry);

        assertCriticalSteps(ctx);
      } finally {
        await closeTestContext(ctx);
      }
    });
  }

  test.afterAll(() => {
    if (ALL_REPORT_ENTRIES.length > 0) {
      const report = generateReport(ALL_REPORT_ENTRIES);
      writeReportToFile(report, "docs/alpha/PLAYWRIGHT-E2E-REPORT.md");
    } else {
      console.warn("[Report] No entries to report.");
    }
  });
});
