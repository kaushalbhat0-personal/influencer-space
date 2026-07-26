import type { Page, Locator } from "@playwright/test";

export class LandingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("h1, main", { timeout: 15000 });
    return true;
  }

  async getHeroHeading(): Promise<string | null> {
    const h1 = this.page.locator("h1").first();
    return h1.textContent();
  }

  async clickCTA(): Promise<void> {
    const cta = this.page.locator('a[href*="signup"], a[href*="pricing"], button:has-text("Get Started")').first();
    await cta.click();
    await this.page.waitForLoadState("networkidle");
  }

  async navigateToPricing(): Promise<void> {
    await this.page.goto("/pricing");
    await this.page.waitForLoadState("networkidle");
  }

  async pricingIsVisible(): Promise<boolean> {
    return this.page.locator("h1, h2, h3").filter({ hasText: /pricing|plan/i }).first().isVisible();
  }

  async getFooterText(): Promise<string | null> {
    return this.page.locator("footer").first().textContent();
  }
}
