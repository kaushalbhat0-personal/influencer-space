/**
 * Super Admin Screenshots — Marketing Assets
 */
import { test } from "../../fixtures/auth";
import path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/marketing-assets/screenshots/superadmin");
const DESKTOP = { width: 1440, height: 900 };

async function capture(page: Parameters<typeof test>[1] extends (arg: infer T) => unknown ? T : never, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

test.describe("Super Admin — Screenshots", () => {
  test.describe.configure({ mode: "serial" });

  test("Dashboard", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "01-dashboard");
  });

  test("Revenue Dashboard", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/revenue");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "02-revenue");
  });

  test("Finance Dashboard", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/finance");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "03-finance");
  });

  test("Settlements Queue", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/settlements");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "04-settlements");
  });

  test("Partner Ledger", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/partner-ledger");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "05-ledger");
  });

  test("Domain Operations", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/domains");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "06-domains");
  });

  test("Theme Registry", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/themes");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "07-themes");
  });

  test("Blueprints Registry", async ({ superAdminPage }) => {
    await superAdminPage.setViewportSize(DESKTOP);
    await superAdminPage.goto("/super-admin/blueprints");
    await superAdminPage.waitForLoadState("networkidle");
    await capture(superAdminPage, "08-blueprints");
  });
});
