import type { Page } from "@playwright/test";

export interface AuthCredentials {
  email: string;
  password: string;
}

export const SEED_CREATOR: AuthCredentials = {
  email: "creator@creatorstore.test",
  password: "TestPass123!",
};

export class AuthPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto("/admin/login");
    await this.page.waitForLoadState("networkidle");
  }

  async login(credentials: AuthCredentials = SEED_CREATOR): Promise<void> {
    await this.gotoLogin();
    await this.page.fill('input#email, input[type="email"], input[name="email"]', credentials.email);
    await this.page.fill('input#password, input[type="password"], input[name="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState("networkidle");
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/admin\/dashboard|\/admin|\/super-admin/, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async gotoSignup(): Promise<void> {
    await this.page.goto("/signup");
    await this.page.waitForLoadState("networkidle");
  }

  async signup(email: string, password: string, name?: string): Promise<void> {
    await this.gotoSignup();
    if (name) {
      const nameInput = this.page.locator('input#name, input[name="name"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(name);
      }
    }
    await this.page.fill('input#email, input[type="email"], input[name="email"]', email);
    await this.page.fill('input#password, input[type="password"], input[name="password"]', password);
    const submitBtn = this.page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")').first();
    await submitBtn.click();
    await this.page.waitForLoadState("networkidle");
  }

  async logout(): Promise<void> {
    const logoutBtn = this.page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")').first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await this.page.waitForLoadState("networkidle");
    }
  }

  async ensureAuthenticated(): Promise<void> {
    const currentUrl = this.page.url();
    if (currentUrl.includes("/admin/login") || currentUrl.includes("/signup") || currentUrl === "about:blank") {
      await this.login();
    }
  }
}
