import type { ElementId, SectionId, PageId, BuilderCanvas } from "../types";

export type ConstraintName = string;

export interface ConstraintContext {
  elementId: ElementId | null;
  moduleId: string | null;
  sectionId: SectionId | null;
  pageId: PageId | null;
  targetSectionId: SectionId | null;
  targetPageId: PageId | null;
  device: BuilderCanvas["device"];
  canvas: { pages: Array<{ sections: Array<{ slots: Array<{ id: string }> }> }> };
  metadata: Record<string, unknown>;
}

export interface ConstraintResult {
  valid: boolean;
  constraint: ConstraintName;
  message: string | null;
  data: unknown;
}

export type ConstraintFn = (ctx: ConstraintContext) => ConstraintResult;

export interface ConstraintDiagnostics {
  totalEvaluations: number;
  passed: number;
  failed: number;
  byConstraint: Record<string, { passed: number; failed: number }>;
}

export interface ModuleConstraint {
  moduleId: string;
  allowedParents: string[];
  allowedChildren: string[];
  maxInstances: number;
  responsive: BuilderCanvas["device"][];
  requiredOnPage: boolean;
}
