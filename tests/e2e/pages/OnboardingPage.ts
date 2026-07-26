import type { Page } from "@playwright/test";

export interface OnboardingResult {
  success: boolean;
  personaName?: string;
  personaScore?: number;
  storefrontUrl?: string;
  dashboardUrl?: string;
  error?: string;
  stages?: Array<{ stage: string; status: string }>;
}

export class OnboardingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/onboarding");
    await this.page.waitForLoadState("networkidle");
  }

  async clickGetStarted(): Promise<void> {
    const btn = this.page.locator('button:has-text("Get Started")').first();
    await btn.click();
    await this.page.waitForLoadState("networkidle");
  }

  async enterUrl(url: string): Promise<void> {
    const input = this.page.locator("#onboarding-url");
    await input.waitFor({ state: "visible", timeout: 10000 });
    await input.fill(url);
    await this.page.waitForTimeout(500);
  }

  async clickAnalyze(): Promise<void> {
    const btn = this.page.locator('button:has-text("Analyze Profile")').first();
    await btn.click();
    await this.page.waitForLoadState("networkidle");
  }

  async waitForPreview(timeout = 30000): Promise<boolean> {
    try {
      await this.page.waitForSelector('button:has-text("Generate"), button:has-text("Generate My Storefront")', { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getErrorText(): Promise<string | null> {
    const errorEl = this.page.locator('[class*="error"], [class*="Error"], [class*="alert"], [class*="Alert"]').first();
    if (await errorEl.isVisible().catch(() => false)) {
      return errorEl.textContent();
    }
    return null;
  }

  async clickGenerate(): Promise<void> {
    const btn = this.page.locator('button:has-text("Generate"), button:has-text("Generate My Storefront")').first();
    await btn.click();
    await this.page.waitForLoadState("networkidle");
  }

  async waitForGenerationComplete(timeout = 180000): Promise<boolean> {
    try {
      await this.page.waitForSelector('button:has-text("Go to Dashboard"), a:has-text("Go to Dashboard"), [class*="complete"]', { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getGenerationResult(): Promise<OnboardingResult> {
    const hasComplete = await this.waitForGenerationComplete().catch(() => false);
    if (!hasComplete) {
      const error = await this.getErrorText();
      return { success: false, error: error ?? "Generation did not complete within timeout" };
    }

    const personaEl = this.page.locator('[class*="persona"] [class*="name"], [class*="Persona"]').first();
    const personaName = (await personaEl.isVisible().catch(() => false))
      ? (await personaEl.textContent()) ?? undefined
      : undefined;

    const scoreEl = this.page.locator('[class*="score"], [class*="Score"]').first();
    const scoreText = (await scoreEl.isVisible().catch(() => false))
      ? await scoreEl.textContent()
      : null;
    const personaScore = scoreText ? parseInt(scoreText.replace(/\D/g, ""), 10) : undefined;

    const storefrontLink = this.page.locator('a:has-text("Storefront"), a[href*="storefront"]').first();
    const storefrontUrl = (await storefrontLink.isVisible().catch(() => false))
      ? (await storefrontLink.getAttribute("href")) ?? undefined
      : undefined;

    const dashboardLink = this.page.locator('a:has-text("Dashboard"), a[href*="dashboard"], button:has-text("Go to Dashboard")').first();
    const dashboardUrl = (await dashboardLink.isVisible().catch(() => false))
      ? (await dashboardLink.getAttribute("href")) ?? (await dashboardLink.getAttribute("data-href")) ?? undefined
      : undefined;

    return {
      success: true,
      personaName,
      personaScore,
      storefrontUrl,
      dashboardUrl,
    };
  }

  async navigateToDashboard(): Promise<void> {
    const btn = this.page.locator('a:has-text("Dashboard"), button:has-text("Go to Dashboard")').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    } else {
      await this.page.goto("/admin/dashboard");
    }
    await this.page.waitForLoadState("networkidle");
  }

  async runFullOnboarding(url: string): Promise<OnboardingResult> {
    await this.goto();
    await this.clickGetStarted();
    await this.enterUrl(url);
    await this.clickAnalyze();
    const previewOk = await this.waitForPreview(30000);
    if (!previewOk) {
      const error = await this.getErrorText();
      return { success: false, error: error ?? "Preview did not load" };
    }
    await this.clickGenerate();
    return this.getGenerationResult();
  }

  async getPreviewPersonaName(): Promise<string | null> {
    const el = this.page.locator('[class*="persona"]').first();
    return (await el.isVisible().catch(() => false)) ? el.textContent() : null;
  }

  async getPreviewConfidence(): Promise<number | null> {
    const el = this.page.locator('[class*="confidence"], [class*="score"]').first();
    const text = (await el.isVisible().catch(() => false)) ? await el.textContent() : null;
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]!, 10) : null;
  }
}
