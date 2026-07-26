import type { Page } from "@playwright/test";

export interface BuilderInfo {
  canvasRendered: boolean;
  inspectorOpens: boolean;
  layersRendered: boolean;
  responsivePreviewWorks: boolean;
  publishSucceeds: boolean;
}

export class BuilderPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/builder");
    await this.page.waitForLoadState("networkidle");
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[class*="builder"], [class*="canvas"], [class*="editor"], main', { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async canvasIsRendered(): Promise<boolean> {
    const canvas = this.page.locator('[class*="canvas"], [class*="preview"], iframe').first();
    return canvas.isVisible().catch(() => false);
  }

  async openInspector(): Promise<boolean> {
    const inspectBtn = this.page.locator('button:has-text("Inspect"), button:has-text("Properties"), [class*="inspector"] button').first();
    if (await inspectBtn.isVisible().catch(() => false)) {
      await inspectBtn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async inspectorIsOpen(): Promise<boolean> {
    const panel = this.page.locator('[class*="inspector"], [class*="properties"], [class*="panel"]').first();
    return panel.isVisible().catch(() => false);
  }

  async layersAreRendered(): Promise<boolean> {
    const layers = this.page.locator('[class*="layer"], [class*="tree"], [class*="outline"]').first();
    return layers.isVisible().catch(() => false);
  }

  async toggleResponsivePreview(): Promise<boolean> {
    const btn = this.page.locator('button:has-text("Desktop"), button:has-text("Mobile"), button:has-text("Tablet"), [class*="responsive"] button').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async isResponsiveView(): Promise<boolean> {
    const viewport = this.page.locator('[class*="mobile"], [class*="tablet"], [class*="responsive-view"]').first();
    return viewport.isVisible().catch(() => false);
  }

  async clickPublish(): Promise<boolean> {
    const publishBtn = this.page.locator('button:has-text("Publish"), button:has-text("Save"), [class*="publish"] button').first();
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click();
      await this.page.waitForLoadState("networkidle");
      return true;
    }
    return false;
  }

  async publishSucceeds(timeout = 30000): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        '[class*="success"], [class*="Success"], [class*="published"], [class*="toast"]:has-text("Published")',
        { timeout },
      );
      return true;
    } catch {
      return false;
    }
  }

  async getBuilderInfo(): Promise<BuilderInfo> {
    const canvasRendered = await this.canvasIsRendered();
    const opened = await this.openInspector();
    const inspectorOpens = await this.inspectorIsOpen();
    const layersRendered = await this.layersAreRendered();
    await this.toggleResponsivePreview();
    const responsivePreviewWorks = await this.isResponsiveView();
    const published = await this.clickPublish();
    const publishSucceeds = published ? await this.publishSucceeds() : false;

    return {
      canvasRendered,
      inspectorOpens,
      layersRendered,
      responsivePreviewWorks,
      publishSucceeds,
    };
  }
}
