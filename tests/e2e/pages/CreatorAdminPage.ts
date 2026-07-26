import type { Page } from "@playwright/test";

export interface AdminSections {
  profile: boolean;
  gallery: boolean;
  products: boolean;
  links: boolean;
  seo: boolean;
}

export class CreatorAdminPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    const url = path.startsWith("/") ? path : `/admin/${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
  }

  async gotoProfile(): Promise<void> {
    await this.goto("/admin/profile");
  }

  async gotoGallery(): Promise<void> {
    await this.goto("/admin/gallery");
  }

  async gotoProducts(): Promise<void> {
    await this.goto("/admin/products");
  }

  async gotoLinks(): Promise<void> {
    await this.goto("/admin/website/navigation");
  }

  async gotoSEO(): Promise<void> {
    await this.goto("/admin/website/seo");
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector("h1, main, form", { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getHeading(): Promise<string | null> {
    return this.page.locator("h1").first().textContent();
  }

  async formIsVisible(): Promise<boolean> {
    return this.page.locator("form, [class*=\"form\"], input, textarea").first().isVisible().catch(() => false);
  }

  async verifyAllSections(): Promise<AdminSections> {
    await this.gotoProfile();
    const profile = await this.isPageLoaded();

    await this.gotoGallery();
    const gallery = await this.isPageLoaded();

    await this.gotoProducts();
    const products = await this.isPageLoaded();

    await this.gotoLinks();
    const links = await this.isPageLoaded();

    await this.gotoSEO();
    const seo = await this.isPageLoaded();

    return { profile, gallery, products, links, seo };
  }
}
