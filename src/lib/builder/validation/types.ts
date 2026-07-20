import type { BuilderCanvas } from "../types";

export type ValidationSeverity = "error" | "warning" | "info" | "suggestion";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  category: string;
  path: string;
  message: string;
  suggestion: string | null;
  elementId: string | null;
}

export interface ValidationReport {
  valid: boolean;
  canvas: BuilderCanvas;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    suggestions: number;
    total: number;
  };
  metadata: {
    pagesScanned: number;
    sectionsScanned: number;
    slotsScanned: number;
    durationMs: number;
    timestamp: string;
  };
}

export type ValidationRuleFn = (canvas: BuilderCanvas) => ValidationIssue[];

export interface ValidationRule {
  name: string;
  category: string;
  description: string;
  severity: ValidationSeverity;
  validate: ValidationRuleFn;
}

export interface ValidationDiagnostics {
  totalRules: number;
  totalIssuesFound: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  lastReport: ValidationReport | null;
}
