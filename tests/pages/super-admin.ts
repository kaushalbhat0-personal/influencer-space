/**
 * Super Admin Page Object v1.0.0
 */

import type { Page, Locator } from "@playwright/test";

export class SuperAdminDashboard {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/super-admin", { waitUntil: "domcontentloaded" });
    await this.page.waitForSelector("h1", { timeout: 15000 });
  }

  async navigateTo(path: string) {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
    await this.page.waitForSelector("h1", { timeout: 15000 });
  }

  async getTenantCount(): Promise<number> {
    const rows = await this.page.locator("table tbody tr").count();
    return rows;
  }

  async hasFeatureFlags(): Promise<boolean> {
    return this.page.locator('a[href="/super-admin/features"]').isVisible();
  }

  async hasAuditLog(): Promise<boolean> {
    return this.page.locator('a[href="/super-admin/audit"]').isVisible();
  }

  async hasHealthPage(): Promise<boolean> {
    return this.page.locator('a[href="/super-admin/health"]').isVisible();
  }
}
