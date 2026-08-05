/**
 * Partner (Agency) Experience Screenshots — RCCF-PLAYWRIGHT-03
 */
import { test } from "../../fixtures/auth";
import path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/marketing-assets/screenshots/partner");
const DESKTOP = { width: 1440, height: 900 };

async function capture(page: Parameters<typeof test>[1] extends (arg: infer T) => unknown ? T : never, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

test.describe("Partner — Screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test("Partner Dashboard", async ({ agencyPage }) => {
    await agencyPage.setViewportSize(DESKTOP);
    await agencyPage.goto("/agency");
    await agencyPage.waitForLoadState("networkidle");
    await capture(agencyPage, "01-dashboard-desktop");
  });

  test("Managed Creators", async ({ agencyPage }) => {
    await agencyPage.setViewportSize(DESKTOP);
    await agencyPage.goto("/agency/clients");
    await agencyPage.waitForLoadState("networkidle");
    await capture(agencyPage, "02-clients-desktop");
  });

  test("Partner Analytics", async ({ agencyPage }) => {
    await agencyPage.setViewportSize(DESKTOP);
    await agencyPage.goto("/agency/analytics");
    await agencyPage.waitForLoadState("networkidle");
    await capture(agencyPage, "03-analytics-desktop");
  });

  test("Partner Billing", async ({ agencyPage }) => {
    await agencyPage.setViewportSize(DESKTOP);
    await agencyPage.goto("/agency/billing");
    await agencyPage.waitForLoadState("networkidle");
    await capture(agencyPage, "04-billing-desktop");
  });

  test("Import Creator", async ({ agencyPage }) => {
    await agencyPage.setViewportSize(DESKTOP);
    await agencyPage.goto("/agency/generate");
    await agencyPage.waitForLoadState("networkidle");
    await capture(agencyPage, "05-import-desktop");
  });
});
