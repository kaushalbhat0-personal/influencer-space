import { test } from "../shared/fixtures";

const EMAIL = process.env.SUPERADMIN_EMAIL ?? "";
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "";
const OUTPUT_DIR = "test-screenshots";

const PAGES = [
  { route: "/super-admin", name: "dashboard" },
  { route: "/super-admin/themes", name: "themes" },
  { route: "/super-admin/templates", name: "templates" },
  { route: "/super-admin/activity", name: "activity" },
  { route: "/super-admin/insights", name: "insights" },
  { route: "/super-admin/revenue-management", name: "revenue-management" },
  { route: "/super-admin/revenue-management/commissions", name: "commissions" },
  { route: "/super-admin/revenue-management/settings", name: "billing-settings" },
  { route: "/super-admin/audit", name: "audit" },
  { route: "/super-admin/health", name: "health" },
  { route: "/super-admin/websites", name: "websites" },
  { route: "/super-admin/revenue", name: "revenue" },
  { route: "/super-admin/subscriptions", name: "subscriptions" },
];

test.describe("Screenshots: Super Admin", () => {
  test.beforeAll(async () => {
    test.skip(!EMAIL, "SUPERADMIN_EMAIL not set");
  });

  for (const page of PAGES) {
    test(`capture ${page.name}`, async ({ page: p, loginPage }) => {
      test.setTimeout(60000);
      await loginPage.goto();
      await loginPage.login(EMAIL, PASSWORD);
      await p.goto(page.route);
      await p.waitForLoadState("networkidle");
      await p.waitForTimeout(2000);
      await p.screenshot({ path: `${OUTPUT_DIR}/${page.name}.png`, fullPage: true });
    });
  }
});
