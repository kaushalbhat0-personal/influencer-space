import type { Page } from "@playwright/test";

export interface StorefrontInfo {
  heroRendered: boolean;
  navigationVisible: boolean;
  galleryVisible: boolean;
  ctaVisible: boolean;
  footerVisible: boolean;
  hasSEOTags: boolean;
  hasJsonLd: boolean;
  sections: string[];
}

export class StorefrontPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(domain: string): Promise<void> {
    const url = domain.startsWith("http") ? domain : `/${domain}`;
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector("main, h1, [class*=\"hero\"]", { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.waitForTimeout(500);
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1440, height: 900 });
    await this.page.waitForTimeout(500);
  }

  async heroIsRendered(): Promise<boolean> {
    return this.page.locator('[class*="hero"], section:first-child h1, [class*="banner"]').first().isVisible().catch(() => false);
  }

  async navigationIsVisible(): Promise<boolean> {
    const nav = this.page.locator("nav, [class*=\"nav\"], [class*=\"navigation\"]").first();
    return nav.isVisible().catch(() => false);
  }

  async galleryIsVisible(): Promise<boolean> {
    return this.page.locator("h2, h3, section").filter({ hasText: /gallery|portfolio|work/i }).first().isVisible().catch(() => false);
  }

  async ctaIsVisible(): Promise<boolean> {
    return this.page.locator('a[href*="contact"], a[href*="shop"], a[href*="order"], button:has-text("Buy"), button:has-text("Contact"), button:has-text("Order")').first().isVisible().catch(() => false);
  }

  async footerIsVisible(): Promise<boolean> {
    return this.page.locator("footer").first().isVisible().catch(() => false);
  }

  async getSEOTitle(): Promise<string | null> {
    return this.page.locator("title").first().textContent();
  }

  async getSEODescription(): Promise<string | null> {
    const meta = this.page.locator('meta[name="description"]');
    return meta.getAttribute("content");
  }

  async hasJsonLd(): Promise<boolean> {
    const scripts = this.page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    return count > 0;
  }

  async getJsonLdContent(): Promise<object[]> {
    const scripts = this.page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    const results: object[] = [];
    for (let i = 0; i < count; i++) {
      try {
        const text = await scripts.nth(i).textContent();
        if (text) results.push(JSON.parse(text));
      } catch {
        // skip invalid JSON
      }
    }
    return results;
  }

  async getVisibleSections(): Promise<string[]> {
    const sections = this.page.locator("section, [class*=\"section\"]");
    const count = await sections.count();
    const names: string[] = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const section = sections.nth(i);
      const id = await section.getAttribute("id");
      const classes = await section.getAttribute("class");
      const h2 = await section.locator("h2").first().textContent();
      const name = id ?? h2 ?? classes?.split(" ").slice(0, 2).join(" ") ?? `section-${i}`;
      names.push(name);
    }
    return names;
  }

  async getStorefrontInfo(): Promise<StorefrontInfo> {
    const sections = await this.getVisibleSections();
    const hasSEOTags = (await this.getSEOTitle()) !== null;

    return {
      heroRendered: await this.heroIsRendered(),
      navigationVisible: await this.navigationIsVisible(),
      galleryVisible: await this.galleryIsVisible(),
      ctaVisible: await this.ctaIsVisible(),
      footerVisible: await this.footerIsVisible(),
      hasSEOTags,
      hasJsonLd: await this.hasJsonLd(),
      sections,
    };
  }
}
