import { Page, expect } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/admin/login");
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectRedirectTo(urlPattern: RegExp) {
    await this.page.waitForURL(urlPattern, { timeout: 15000 });
  }

  async expectError() {
    await expect(this.page.locator("text=Invalid email or password").or(this.page.locator("text=Invalid").or(this.page.locator("text=Error")))).toBeVisible({ timeout: 20000 });
  }
}
