import { Page, expect } from "@playwright/test";

export class RegistrationPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/signup");
    await this.page.waitForLoadState("networkidle");
  }

  async selectPersona(persona: "creator" | "agency") {
    await this.page.click(`text=${persona === "creator" ? "Creator" : "Agency"}`);
  }

  async selectPlan(planCode: string) {
    await this.page.click(`[data-plan="${planCode}"]`);
  }

  async fillAccountDetails(name: string, email: string, password: string) {
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async registerCreator(name: string, email: string, password: string) {
    await this.goto();
    await this.selectPersona("creator");
    await this.selectPlan("creator_free");
    await this.fillAccountDetails(name, email, password);
    await this.submit();
  }

  async registerAgency(name: string, email: string, password: string) {
    await this.goto();
    await this.selectPersona("agency");
    await this.selectPlan("agency_free");
    await this.fillAccountDetails(name, email, password);
    await this.submit();
  }

  async expectRedirectTo(pathPattern: RegExp) {
    await this.page.waitForURL(pathPattern, { timeout: 20000 });
  }
}
