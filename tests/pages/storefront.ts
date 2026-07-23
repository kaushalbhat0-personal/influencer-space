/**
 * Storefront Page Object v1.0.0
 */

import type { Page, Locator } from "@playwright/test";

export class Storefront {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(subdomain = "testcreator") {
    await this.page.goto(`/${subdomain}`);
    await this.page.waitForLoadState("networkidle");
  }

  async getTitle(): Promise<string | null> {
    return this.page.locator("h1").first().textContent();
  }

  async hasProducts(): Promise<boolean> {
    return this.page.locator('.grid.grid-cols-2.gap-3 > div').first().isVisible().catch(() => false);
  }

  async hasGallery(): Promise<boolean> {
    return this.page.locator('h2:has-text("Gallery"), h2:has-text("Hall of Fame")').first().isVisible().catch(() => false);
  }

  async getNotFoundText(): Promise<string | null> {
    return this.page.locator("main h1").first().textContent();
  }
}
