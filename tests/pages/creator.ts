/**
 * Creator Dashboard Page Object v1.0.0
 */

import type { Page, Locator } from "@playwright/test";

export class CreatorDashboard {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly dashboardLink: Locator;
  readonly productsLink: Locator;
  readonly ordersLink: Locator;
  readonly analyticsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator("aside, nav").first();
    this.dashboardLink = page.locator('a[href="/admin/dashboard"]');
    this.productsLink = page.locator('a[href="/admin/products"]');
    this.ordersLink = page.locator('a[href="/admin/orders"]');
    this.analyticsLink = page.locator('a[href="/admin/analytics"]');
  }

  async goto() {
    await this.page.goto("/admin/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  async getMetricCards(): Promise<Locator> {
    return this.page.locator(".admin-card").filter({ has: this.page.locator(".text-2xl") });
  }

  async getMetricValue(label: string): Promise<string | null> {
    const card = this.page.locator(".admin-card p").filter({ hasText: label }).first();
    if (!(await card.isVisible())) return null;
    const value = await card.locator("..").locator(".text-2xl, .font-display").textContent();
    return value?.trim() ?? null;
  }
}

export class CreatorOrders {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/admin/orders");
    await this.page.waitForLoadState("networkidle");
  }

  async getOrderCount(): Promise<number> {
    const rows = await this.page.locator("table tbody tr").count();
    return rows;
  }

  async searchOrders(query: string) {
    await this.page.fill('input[placeholder*="Search"]', query);
  }
}
