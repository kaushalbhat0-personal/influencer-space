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
    await this.page.goto("/super-admin");
    await this.page.waitForLoadState("networkidle");
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
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
