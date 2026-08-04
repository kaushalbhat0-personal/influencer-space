import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import path from "path";

export const SHOT_DIR = path.resolve("playwright-report", "screenshots");
export const CREATOR_EMAIL = process.env.CREATOR_EMAIL ?? "testcreator1@gmail.com";
export const CREATOR_PASSWORD = process.env.CREATOR_PASSWORD ?? "admin123";
export const CREATOR_SUBDOMAIN = process.env.CREATOR_SUBDOMAIN ?? "test-creator-1";

export function ensureShotDir(): void {
  mkdirSync(SHOT_DIR, { recursive: true });
}

export async function shot(page: Page, name: string): Promise<void> {
  ensureShotDir();
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

/** Log into the real production creator account. */
export async function loginAsCreator(page: Page): Promise<void> {
  // networkidle ensures React hydration finished so the form's onSubmit
  // handler is attached — otherwise the submit fires a native form POST and
  // login silently fails.
  await page.goto("/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.fill("#email", CREATOR_EMAIL);
  await page.fill("#password", CREATOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 25000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

const BENIGN = [
  "favicon",
  ".map",
  "react devtools",
  "download the react devtools",
  "autofocus processing",
  "cross origin isolation",
  "failed to load resource: the server responded with a status of 404 (not found)",
  // Browser-canceled in-flight requests (navigation aborts an RSC prefetch).
  "net::err_aborted",
  // Next.js RSC prefetch fallback ("Failed to fetch RSC payload … Falling back
  // to browser navigation") — the app degrades gracefully; not a page error.
  "failed to fetch rsc payload",
  "_rsc=",
  // Vercel Insights / Speed Insights only exist on the Vercel platform; running
  // the production build locally (next start) 404s them — environment artifact.
  "_vercel/insights",
  "_vercel/speed-insights",
  // Third-party payment-gateway CDN resources (external dependency, not the app).
  "razorpay.com",
  "checkout-static-next.razorpay.com",
  "err_blocked_by_orb",
  // Transient OS/network buffer pressure while loading external font CDNs.
  "err_no_buffer_space",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

/**
 * Collects console errors, unhandled page exceptions, 4xx/5xx responses and
 * failed requests. `assertClean()` fails the test if anything was captured.
 */
export class ErrorCollector {
  readonly errors: string[] = [];
  private readonly failedRequests: string[] = [];

  constructor(private readonly page: Page) {}

  install(): void {
    this.page.on("console", (m) => {
      if (m.type() === "error") this.push(m.text());
    });
    this.page.on("pageerror", (e) => this.push(`pageerror: ${e.message}`));
    this.page.on("response", (r) => {
      const status = r.status();
      const url = r.url();
      if (status >= 400 && !url.includes("/_next/")) {
        this.push(`HTTP ${status} ${url}`);
      }
    });
    this.page.on("requestfailed", (r) => {
      const url = r.url();
      if (!this.isBenign(url)) {
        this.failedRequests.push(url);
        this.push(`requestfailed: ${r.failure()?.errorText ?? "failed"} ${url}`);
      }
    });
  }

  private push(message: string): void {
    if (this.isBenign(message)) return;
    const trimmed = message.slice(0, 400);
    if (!this.errors.includes(trimmed)) this.errors.push(trimmed);
  }

  private isBenign(message: string): boolean {
    const lower = message.toLowerCase();
    return BENIGN.some((b) => lower.includes(b));
  }

  list(): string[] {
    return [...this.errors];
  }

  assertClean(): void {
    expect(
      this.errors,
      `Console/network errors detected:\n${this.errors.join("\n")}`,
    ).toEqual([]);
  }
}
