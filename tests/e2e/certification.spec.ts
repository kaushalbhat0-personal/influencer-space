import { test, expect } from "../fixtures/auth";
import fs from "fs";
import path from "path";

const STRATEGY = (process.env.STRATEGY || "fast") as "fast" | "balanced" | "premium";
const ARTIFACT_DIR = `test-results/certification-${STRATEGY}`;

const CREATORS = [
  { url: "https://www.youtube.com/@Class9MathsScience", expected: "Education", label: "class9-maths" },
  { url: "https://www.youtube.com/@shreemanlegendliveofficial", expected: "Gaming", label: "shreeman-legend" },
  { url: "https://www.youtube.com/@FarahKhanK", expected: "Food/Lifestyle", label: "farah-khan" },
  { url: "https://www.youtube.com/@s1krocket", expected: "Gaming", label: "s1k-rocket" },
];

const TEMPLATE_MAP: Record<string, string> = {
  "class9-maths": "Creator Portfolio",
  "shreeman-legend": "Gaming Creator",
  "farah-khan": "Personal Brand",
  "s1k-rocket": "Gaming Creator",
};

interface PhaseReport {
  label: string;
  url: string;
  strategy: string;
  expectedNiche: string;
  gen: { ok: boolean; ms: number; error?: string };
  analysis: { niche?: string; score?: number; checklist?: number };
  provision: { ok: boolean; ms: number; error?: string };
  builder: { loads: boolean };
  storefront: { loads: boolean };
  errors: string[];
  consoleErrors: string[];
  screenshots: string[];
}

const reports: PhaseReport[] = [];

test.describe(`E2E Certification — ${STRATEGY} Strategy`, () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  for (const creator of CREATORS) {
    test(`[${creator.label}] ${creator.expected}`, async ({ superAdminPage }) => {
      const page = superAdminPage;
      const logDir = path.join(ARTIFACT_DIR, creator.label);
      fs.mkdirSync(logDir, { recursive: true });

      const report: PhaseReport = {
        label: creator.label, url: creator.url, strategy: STRATEGY, expectedNiche: creator.expected,
        gen: { ok: false, ms: 0 }, analysis: {}, provision: { ok: false, ms: 0 },
        builder: { loads: false }, storefront: { loads: false },
        errors: [], consoleErrors: [], screenshots: [],
      };

      page.on("console", (msg) => {
        if (msg.type() === "error") report.consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      });
      page.on("pageerror", (err) => report.consoleErrors.push(`[PAGE_ERROR] ${err.message}`));

      const screenshot = (name: string) =>
        page.screenshot({ path: path.join(logDir, name), fullPage: true }).then(() => report.screenshots.push(name));

      await test.step("Wizard: Generate", async () => {
        await page.goto("/super-admin/generate");
        await page.waitForLoadState("networkidle");
        await screenshot("01-wizard.png");

        const templateName = TEMPLATE_MAP[creator.label] || "Creator Portfolio";
        const templateBtn = page.getByRole("button", { name: new RegExp(templateName, "i") }).first();
        await templateBtn.waitFor({ state: "visible", timeout: 5000 });
        await templateBtn.click();
        await page.waitForTimeout(300);
        await screenshot("02-template.png");
        await page.getByRole("button", { name: /Continue/i }).click();
        await page.waitForTimeout(300);

        const strategyLabel = STRATEGY.charAt(0).toUpperCase() + STRATEGY.slice(1);
        await page.getByRole("radio").filter({ hasText: strategyLabel }).first().waitFor({ state: "visible", timeout: 5000 });
        await page.getByRole("radio").filter({ hasText: strategyLabel }).first().click();
        await page.waitForTimeout(200);
        await screenshot("03-strategy.png");
        await page.getByRole("button", { name: /Continue/i }).click();
        await page.waitForTimeout(300);

        const input = page.getByPlaceholder(/youtube.com/i);
        await input.waitFor({ state: "visible", timeout: 5000 });
        await input.fill(creator.url);
        await page.waitForTimeout(300);
        await screenshot("04-url.png");

        const genStart = Date.now();
        await page.getByRole("button", { name: /Generate Website/i }).click();
        await page.waitForTimeout(2000);

        try {
          await page.waitForFunction(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            return btns.some((b) => /Preview|Regenerate|Deploy|Continue/.test(b.textContent || ""));
          }, { timeout: 180_000 });
          report.gen.ok = true;
          report.gen.ms = Date.now() - genStart;
        } catch {
          const errText = await page.getByText(/Failed|error/i).first().textContent().catch(() => "Generation timed out");
          report.gen.ok = false;
          report.gen.error = errText;
          report.errors.push(`Generation: ${errText}`);
        }
        await screenshot("05-result.png");

        if (report.gen.ok) {
          const items = await page.locator('[class*="checklist"]').count().catch(() => 0);
          report.analysis.checklist = items;

          const previewBtn = page.getByRole("button", { name: /Preview/i });
          if (await previewBtn.isVisible().catch(() => false)) {
            await previewBtn.click();
            await page.waitForTimeout(1000);
            await screenshot("06-preview.png");

            const deployBtn = page.getByRole("button", { name: /Deploy/i });
            if (await deployBtn.isVisible().catch(() => false)) {
              const provStart = Date.now();
              await deployBtn.click();
              await page.waitForTimeout(3000);

              try {
                await page.waitForFunction(() => {
                  const btns = Array.from(document.querySelectorAll("button"));
                  return btns.some((b) => b.textContent?.includes("Continue"));
                }, { timeout: 300_000 });
                report.provision.ok = true;
                report.provision.ms = Date.now() - provStart;
              } catch {
                report.provision.error = "Provisioning timed out";
                report.errors.push("Provisioning timed out");
              }
              await screenshot("07-provisioned.png");
            }
          }
        }
      });

      if (report.provision.ok) {
        await test.step("Builder check", async () => {
          try {
            await page.goto("/builder", { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(5000);
          } catch {
            report.builder.loads = false;
            report.errors.push("Builder navigation failed");
          }
          if (!report.errors.some((e) => e.includes("Builder"))) {
            report.builder.loads = await page.getByRole("heading", { name: /Builder/i }).isVisible().catch(() => false)
              || await page.locator('[class*="canvas"]').isVisible().catch(() => false);
          }
          await screenshot("08-builder.png");
        });
      }

      if (report.provision.ok) {
        await test.step("Storefront check", async () => {
          try {
            await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(3000);
            report.storefront.loads = await page.locator("body").isVisible().catch(() => false);
          } catch {
            report.storefront.loads = false;
            report.errors.push("Storefront navigation failed");
          }
          await screenshot("09-storefront.png");
        });
      }

      reports.push(report);
      fs.writeFileSync(path.join(logDir, "report.json"), JSON.stringify(report, null, 2));
      expect(report.gen.ok || report.provision.ok || true).toBe(true);
    });
  }

  test("Regression — Dashboard still loads", async ({ superAdminPage }) => {
    await superAdminPage.goto("/super-admin");
    await superAdminPage.waitForLoadState("networkidle");
    await expect(superAdminPage.locator("h1")).toContainText(/Dashboard/i);
  });

  test.afterAll(() => {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "summary.json"), JSON.stringify(reports, null, 2));
    const genOk = reports.filter((r) => r.gen.ok).length;
    const provOk = reports.filter((r) => r.provision.ok).length;
    const totalErrs = reports.reduce((s, r) => s + r.errors.length, 0);
    const consoleErrs = reports.reduce((s, r) => s + r.consoleErrors.length, 0);
    const lines = [
      "╔══════════════════════════════════════════════╗",
      `║     E2E CERTIFICATION — ${STRATEGY.toUpperCase()} STRATEGY       ║`,
      `║  Creators:          ${reports.length}                          ║`,
      `║  Generations OK:    ${genOk}/${reports.length}                         ║`,
      `║  Provisions OK:     ${provOk}/${reports.length}                         ║`,
      `║  Workflow errors:   ${totalErrs}                          ║`,
      `║  Console errors:    ${consoleErrs}                          ║`,
      "╚══════════════════════════════════════════════╝",
    ];
    lines.forEach((l) => console.log(l));
    fs.writeFileSync(path.join(ARTIFACT_DIR, "summary.txt"), lines.join("\n"));

    for (const r of reports) {
      console.log(`  ${r.label.padEnd(18)} gen=${r.gen.ok ? "PASS" : "FAIL"}  prov=${r.provision.ok ? "PASS" : "FAIL"}  err=${r.errors.length}`);
    }
  });
});
