import type { BuilderCanvas, BuilderSection, BuilderSlot } from "../types";
import type { ValidationIssue, ValidationReport, ValidationRule, ValidationDiagnostics } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

function issue(code: string, severity: ValidationIssue["severity"], category: string, path: string, message: string, suggestion: string | null = null, elementId: string | null = null): ValidationIssue {
  return { code, severity, category, path, message, suggestion, elementId };
}

function collectSlots(canvas: BuilderCanvas): { allSlots: BuilderSlot[]; allSections: BuilderSection[] } {
  const allSlots: BuilderSlot[] = [];
  const allSections: BuilderSection[] = [];
  for (const page of canvas.pages) {
    for (const section of page.sections) {
      allSections.push(section);
      allSlots.push(...section.slots);
    }
  }
  return { allSlots, allSections };
}

const rules: ValidationRule[] = [
  {
    name: "duplicate-ids", category: "structure", description: "Check for duplicate element IDs", severity: "error",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots, allSections } = collectSlots(canvas);
      const allIds = [...allSections.map((s) => s.id), ...allSlots.map((s) => s.id)];
      const seen = new Map<string, number>();
      for (const id of allIds) { seen.set(id, (seen.get(id) ?? 0) + 1); }
      for (const [id, count] of Array.from(seen.entries())) {
        if (count > 1) issues.push(issue("STRUCT-001", "error", "structure", `id:${id}`, `Duplicate ID "${id}" found ${count} times`, "Regenerate or rename one of the elements", id));
      }
      return issues;
    },
  },
  {
    name: "broken-references", category: "structure", description: "Check for broken parent references", severity: "error",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots } = collectSlots(canvas);
      const sectionIds = new Set(canvas.pages.flatMap((p) => p.sections.map((s) => s.id)));
      for (const slot of allSlots) {
        if (slot.parentId && !sectionIds.has(slot.parentId)) {
          issues.push(issue("STRUCT-002", "error", "structure", `slot:${slot.id}`, `Slot "${slot.id}" references missing parent section "${slot.parentId}"`, "Remove or reassign the slot", slot.id));
        }
      }
      return issues;
    },
  },
  {
    name: "required-modules", category: "structure", description: "Verify required modules are present", severity: "warning",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots } = collectSlots(canvas);
      const hasHero = allSlots.some((s) => s.moduleId.includes("hero"));
      if (!hasHero) issues.push(issue("STRUCT-003", "warning", "structure", "pages", "No Hero module found — every page should have a hero section", "Add a Hero module from the sidebar"));
      return issues;
    },
  },
  {
    name: "empty-content", category: "content", description: "Check for empty modules", severity: "info",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSections } = collectSlots(canvas);
      for (const section of allSections) {
        if (section.slots.length === 0) {
          issues.push(issue("CONT-001", "info", "content", `section:${section.id}`, `Section "${section.name}" has no modules`, "Add modules or remove the section", section.id));
        }
      }
      return issues;
    },
  },
  {
    name: "seo-metadata", category: "seo", description: "Check basic SEO requirements", severity: "warning",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      for (const page of canvas.pages) {
        if (!page.name || page.name.trim().length === 0) issues.push(issue("SEO-001", "warning", "seo", `page:${page.id}`, "Page has no title — this affects SEO", "Set a page title in Properties", page.id));
        if (page.slug && page.slug.length > 60) issues.push(issue("SEO-002", "info", "seo", `page:${page.id}`, `Slug "${page.slug}" is ${page.slug.length} characters (recommended max: 60)`, "Shorten the slug", page.id));
      }
      return issues;
    },
  },
  {
    name: "navigation-integrity", category: "structure", description: "Verify at least one page is marked as home", severity: "error",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const homePages = canvas.pages.filter((p) => p.isHome);
      if (homePages.length === 0) issues.push(issue("STRUCT-004", "error", "structure", "pages", "No page is marked as home — visitors will see a 404", "Mark one page as the home page"));
      if (homePages.length > 1) issues.push(issue("STRUCT-005", "warning", "structure", "pages", "Multiple pages marked as home — only the first will be used", "Keep only one home page"));
      return issues;
    },
  },
  {
    name: "accessibility", category: "accessibility", description: "Basic accessibility checks", severity: "info",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots } = collectSlots(canvas);
      const totalSlots = allSlots.length;
      if (totalSlots > 30) issues.push(issue("A11Y-001", "info", "accessibility", "pages", `${totalSlots} modules on page — consider simplifying for better accessibility`, "Reduce module count or split into multiple pages"));
      return issues;
    },
  },
  {
    name: "theme-consistency", category: "theme", description: "Check theme consistency across pages", severity: "info",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const themes = new Set(canvas.pages.map((p) => p.theme));
      if (themes.size > 1) issues.push(issue("THM-001", "info", "theme", "pages", `Multiple themes detected across pages: ${Array.from(themes).join(", ")}`, "Use a consistent theme for visual coherence"));
      return issues;
    },
  },
  {
    name: "performance", category: "performance", description: "Performance warnings", severity: "info",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots } = collectSlots(canvas);
      if (allSlots.length > 50) issues.push(issue("PERF-001", "warning", "performance", "pages", `${allSlots.length} modules — performance may degrade on slow connections`, "Consider lazy-loading below-the-fold modules"));
      return issues;
    },
  },
  {
    name: "hidden-elements", category: "content", description: "Report hidden elements", severity: "info",
    validate: (canvas) => {
      const issues: ValidationIssue[] = [];
      const { allSlots } = collectSlots(canvas);
      const hidden = allSlots.filter((s) => !s.visible);
      for (const slot of hidden) {
        issues.push(issue("CONT-002", "info", "content", `slot:${slot.id}`, `Hidden module: "${slot.moduleId}"`, "Remove or make visible", slot.id));
      }
      return issues;
    },
  },
];

export class DocumentValidator {
  private rules = new Map<string, ValidationRule>();
  private lastReport: ValidationReport | null = null;
  private totalIssuesFound = 0;

  constructor() {
    for (const rule of rules) this.rules.set(rule.name, rule);
  }

  register(rule: ValidationRule): void { this.rules.set(rule.name, rule); }
  unregister(name: string): boolean { return this.rules.delete(name); }

  validate(canvas: BuilderCanvas): ValidationReport {
    const start = performance.now();
    const allIssues: ValidationIssue[] = [];

    for (const [name, rule] of Array.from(this.rules.entries())) {
      try {
        const ruleIssues = rule.validate(canvas);
        allIssues.push(...ruleIssues);
      } catch (err) {
        allIssues.push(issue(name, "error", "system", "rules", `Validation rule "${name}" failed: ${err instanceof Error ? err.message : String(err)}`));
      }
    }

    this.totalIssuesFound += allIssues.length;

    const errors = allIssues.filter((i) => i.severity === "error").length;
    const warnings = allIssues.filter((i) => i.severity === "warning").length;
    const info = allIssues.filter((i) => i.severity === "info").length;
    const suggestions = allIssues.filter((i) => i.severity === "suggestion").length;

    const { allSlots, allSections } = collectSlots(canvas);

    const report: ValidationReport = {
      valid: errors === 0,
      canvas,
      issues: allIssues,
      summary: { errors, warnings, info, suggestions, total: allIssues.length },
      metadata: {
        pagesScanned: canvas.pages.length,
        sectionsScanned: allSections.length,
        slotsScanned: allSlots.length,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        timestamp: new Date().toISOString(),
      },
    };

    this.lastReport = report;
    platformTelemetry.counter("builder.validation.run", 1, { errors: String(errors), warnings: String(warnings) });
    platformTelemetry.timer("builder.validation.duration", performance.now() - start);

    return report;
  }

  getLastReport(): ValidationReport | null { return this.lastReport; }

  diagnostics(): ValidationDiagnostics {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const rule of Array.from(this.rules.values())) { byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1; bySeverity[rule.severity] = (bySeverity[rule.severity] ?? 0) + 1; }
    return { totalRules: this.rules.size, totalIssuesFound: this.totalIssuesFound, byCategory, bySeverity, lastReport: this.lastReport };
  }
}

export const documentValidator = new DocumentValidator();
