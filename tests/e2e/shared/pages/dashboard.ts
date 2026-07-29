import { Page, expect } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/admin/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async expectWelcomeMessage(name: string) {
    await expect(this.page.locator(`text=Welcome back`).first()).toBeVisible({ timeout: 10000 });
  }

  async expectHealthVisible() {
    await expect(this.page.locator("text=Website Health").first()).toBeVisible();
  }

  async clickOpenBuilder() {
    await this.page.click('a[href="/builder"]');
    await this.page.waitForLoadState("networkidle");
  }
}
