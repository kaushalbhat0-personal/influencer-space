import { Page, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export interface DiagnosticContext {
  page: Page;
  testInfo: TestInfo;
  screenshotDir: string;
  consoleErrors: string[];
  networkErrors: string[];
}

export function createDiagnosticContext(page: Page, testInfo: TestInfo, screenshotDir: string): DiagnosticContext {
  const ctx: DiagnosticContext = {
    page,
    testInfo,
    screenshotDir,
    consoleErrors: [],
    networkErrors: [],
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      ctx.consoleErrors.push(`[ConsoleError] ${msg.text()}`);
    }
  });

  page.on("requestfailed", (req) => {
    ctx.networkErrors.push(`[NetworkError] ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`);
  });

  return ctx;
}

export async function captureScreenshot(
  ctx: DiagnosticContext,
  name: string,
): Promise<string> {
  const dir = ctx.screenshotDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `${name}.png`);
  await ctx.page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export async function captureDiagnosticsOnFailure(
  ctx: DiagnosticContext,
): Promise<void> {
  const { testInfo, page } = ctx;
  if (testInfo.status !== "passed" && testInfo.status !== "expected") {
    const failureDir = path.join(ctx.screenshotDir, "failures");
    if (!fs.existsSync(failureDir)) {
      fs.mkdirSync(failureDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(failureDir, `failure-${testInfo.title.replace(/\s+/g, "-")}.png`),
      fullPage: true,
    });

    try {
      await page.context().tracing.stop({
        path: path.join(failureDir, `trace-${testInfo.title.replace(/\s+/g, "-")}.zip`),
      });
    } catch {
      // trace not started
    }
  }
}

export function formatErrors(ctx: DiagnosticContext): string[] {
  return [...ctx.consoleErrors, ...ctx.networkErrors];
}

export function hasCriticalErrors(ctx: DiagnosticContext): boolean {
  return ctx.consoleErrors.length > 0 || ctx.networkErrors.length > 0;
}
