import type { Page, Locator } from "@playwright/test";

export interface DashboardInfo {
  metricCards: number;
  sidebarLinks: string[];
  pageTitle: string;
  hasProfileSection: boolean;
  hasAnalyticsSection: boolean;
}

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator("aside, nav").first();
  }

  async goto(): Promise<void> {
    await this.page.goto("/admin/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("aside, nav, main", { timeout: 15000 });
    return true;
  }

  async getMetricCards(): Promise<number> {
    const cards = this.page.locator('[class*="metric"], [class*="stat"], [class*="card"]').filter({
      has: this.page.locator(".text-2xl, .font-display, [class*=\"value\"]"),
    });
    return cards.count();
  }

  async getMetricValue(label: string): Promise<string | null> {
    const card = this.page.locator("p, span, label").filter({ hasText: label }).first();
    if (!(await card.isVisible().catch(() => false))) return null;
    const parent = card.locator("..");
    const value = parent.locator(".text-2xl, .font-display, [class*=\"value\"]").first();
    return (await value.isVisible().catch(() => false)) ? value.textContent() : null;
  }

  async getSidebarLinks(): Promise<string[]> {
    const links = this.sidebar.locator("a");
    const count = await links.count();
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }
    return hrefs;
  }

  async getPageTitle(): Promise<string> {
    return (await this.page.locator("h1").first().textContent()) ?? "";
  }

  async hasAnalytics(): Promise<boolean> {
    const analyticsSection = this.page.locator("h2, h3, section").filter({ hasText: /analytics|overview|insight/i }).first();
    return analyticsSection.isVisible().catch(() => false);
  }

  async hasProfilePreview(): Promise<boolean> {
    const profile = this.page.locator('[class*="profile"], [class*="avatar"], [class*="creator"]').first();
    return profile.isVisible().catch(() => false);
  }

  async getDashboardInfo(): Promise<DashboardInfo> {
    return {
      metricCards: await this.getMetricCards(),
      sidebarLinks: await this.getSidebarLinks(),
      pageTitle: await this.getPageTitle(),
      hasProfileSection: await this.hasProfilePreview(),
      hasAnalyticsSection: await this.hasAnalytics(),
    };
  }
}
