import { describe, it, expect } from "vitest";
import { checkRules } from "./checker";

describe("Architecture Verification", () => {
  const report = checkRules();

  it("should pass all dependency rules", () => {
    if (report.violations.length > 0) {
      console.error(`\n${report.violations.length} architecture violations found:`);
      for (const v of report.violations) {
        console.error(`  [${v.rule}] ${v.file} → ${v.importPath}`);
      }
    }
    for (const w of report.warnings) {
      console.warn(`  WARN [${w.rule}] ${w.file} → ${w.importPath}`);
    }
    expect(report.violations).toHaveLength(0);
  });

  it("should track scan statistics", () => {
    expect(report.stats.filesScanned).toBeGreaterThan(0);
    expect(report.stats.importsChecked).toBeGreaterThan(0);
    console.log(`  Scanned ${report.stats.filesScanned} files, ${report.stats.importsChecked} imports`);
  });
});
