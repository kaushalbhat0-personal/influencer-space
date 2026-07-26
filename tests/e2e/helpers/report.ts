import * as fs from "fs";
import * as path from "path";
import type { SmokeCreator } from "../fixtures/test-creators";

export interface StepResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface CreatorTestReportEntry {
  creator: SmokeCreator;
  passed: boolean;
  steps: StepResult[];
  personaName?: string;
  personaScore?: number;
  generationTimeMs?: number;
  publishTimeMs?: number;
  storefrontUrl?: string;
  screenshots: string[];
  consoleErrors: string[];
  networkErrors: string[];
  cleanupVerified: boolean;
}

export interface SmokeTestReport {
  generatedAt: string;
  totalCreators: number;
  passed: number;
  failed: number;
  averageGenerationTimeMs: number;
  averageTestDurationMs: number;
  averagePublishTimeMs: number;
  totalScreenshots: number;
  cleanupVerified: boolean;
  entries: CreatorTestReportEntry[];
}

export function generateReport(entries: CreatorTestReportEntry[]): SmokeTestReport {
  const passed = entries.filter((e) => e.passed).length;
  const failed = entries.filter((e) => !e.passed).length;
  const genTimes = entries
    .map((e) => e.generationTimeMs)
    .filter((t): t is number => t !== undefined);
  const testDurations = entries.map((e) =>
    e.steps.reduce((sum, s) => sum + s.durationMs, 0),
  );
  const publishTimes = entries
    .map((e) => e.publishTimeMs)
    .filter((t): t is number => t !== undefined);
  const totalScreenshots = entries.reduce((sum, e) => sum + e.screenshots.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalCreators: entries.length,
    passed,
    failed,
    averageGenerationTimeMs: genTimes.length > 0
      ? Math.round(genTimes.reduce((a, b) => a + b, 0) / genTimes.length)
      : 0,
    averageTestDurationMs: testDurations.length > 0
      ? Math.round(testDurations.reduce((a, b) => a + b, 0) / testDurations.length)
      : 0,
    averagePublishTimeMs: publishTimes.length > 0
      ? Math.round(publishTimes.reduce((a, b) => a + b, 0) / publishTimes.length)
      : 0,
    totalScreenshots,
    cleanupVerified: entries.every((e) => e.cleanupVerified),
    entries,
  };
}

export function writeReportToFile(report: SmokeTestReport, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];
  lines.push("# CreatorStore E2E Smoke Test Report");
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Creators | ${report.totalCreators} |`);
  lines.push(`| Passed | ${report.passed} |`);
  lines.push(`| Failed | ${report.failed} |`);
  lines.push(`| Pass Rate | ${report.totalCreators > 0 ? Math.round((report.passed / report.totalCreators) * 100) : 0}% |`);
  lines.push(`| Average Generation Time | ${report.averageGenerationTimeMs}ms |`);
  lines.push(`| Average Publish Time | ${report.averagePublishTimeMs}ms |`);
  lines.push(`| Average Test Duration | ${report.averageTestDurationMs}ms |`);
  lines.push(`| Total Screenshots | ${report.totalScreenshots} |`);
  lines.push(`| Cleanup Verified | ${report.cleanupVerified ? "Yes" : "No"} |`);
  lines.push("");

  lines.push("## Per-Creator Results");
  lines.push("");
  lines.push("| # | Creator | Niche | Persona | Score | Gen Time | Publish | Result | Screenshots | Console Errors |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");

  for (let i = 0; i < report.entries.length; i++) {
    const entry = report.entries[i];
    const result = entry.passed ? "PASS" : "FAIL";
    const genTime = entry.generationTimeMs !== undefined ? `${entry.generationTimeMs}ms` : "—";
    const pubTime = entry.publishTimeMs !== undefined ? `${entry.publishTimeMs}ms` : "—";
    const persona = entry.personaName ?? "—";
    const score = entry.personaScore !== undefined ? String(entry.personaScore) : "—";
    const screenshots = entry.screenshots.length > 0 ? entry.screenshots.join(", ") : "—";
    const consoleErrCount = entry.consoleErrors.length;
    lines.push(`| ${i + 1} | ${entry.creator.creatorName} | ${entry.creator.niche} | ${persona} | ${score} | ${genTime} | ${pubTime} | ${result} | ${screenshots} | ${consoleErrCount} |`);
  }

  lines.push("");
  lines.push("## Detailed Results");
  lines.push("");

  for (const entry of report.entries) {
    lines.push(`### ${entry.creator.creatorName} (${entry.creator.niche})`);
    lines.push("");
    lines.push(`**URL:** ${entry.creator.youtubeUrl}`);
    lines.push(`**Result:** ${entry.passed ? "✅ PASS" : "❌ FAIL"}`);
    lines.push(`**Persona:** ${entry.personaName ?? "—"} | **Score:** ${entry.personaScore ?? "—"}`);
    lines.push(`**Generation Time:** ${entry.generationTimeMs !== undefined ? `${entry.generationTimeMs}ms` : "—"}`);
    lines.push(`**Publish Time:** ${entry.publishTimeMs !== undefined ? `${entry.publishTimeMs}ms` : "—"}`);
    lines.push(`**Storefront:** ${entry.storefrontUrl ?? "—"}`);
    lines.push(`**Cleanup Verified:** ${entry.cleanupVerified ? "Yes" : "No"}`);
    lines.push("");

    lines.push("#### Steps");
    lines.push("");
    lines.push("| Step | Passed | Duration | Error |");
    lines.push("|---|---|---|---|");
    for (const step of entry.steps) {
      const stepResult = step.passed ? "✅" : "❌";
      const error = step.error ?? "—";
      lines.push(`| ${step.name} | ${stepResult} | ${step.durationMs}ms | ${error} |`);
    }
    lines.push("");

    if (entry.screenshots.length > 0) {
      lines.push("#### Screenshots");
      lines.push("");
      for (const s of entry.screenshots) {
        lines.push(`- \`${s}\``);
      }
      lines.push("");
    }

    if (entry.consoleErrors.length > 0) {
      lines.push("#### Console Errors");
      lines.push("");
      for (const err of entry.consoleErrors) {
        lines.push(`- \`${err}\``);
      }
      lines.push("");
    }

    if (entry.networkErrors.length > 0) {
      lines.push("#### Network Errors");
      lines.push("");
      for (const err of entry.networkErrors) {
        lines.push(`- \`${err}\``);
      }
      lines.push("");
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  console.log(`[Report] Written to ${filePath}`);
}
