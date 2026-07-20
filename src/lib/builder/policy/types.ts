import type { ElementId } from "../types";

export type PolicyName =
  | "canSelect"
  | "canMove"
  | "canInsert"
  | "canDelete"
  | "canDuplicate"
  | "canResize"
  | "canEdit"
  | "canPublish"
  | "canPreview"
  | "canDrag";

export interface InteractionContext {
  elementId: ElementId | null;
  sectionId: string | null;
  pageId: string | null;
  role: string;
  plan: string;
  isLocked: boolean;
  isHidden: boolean;
  isReadOnly: boolean;
  isDraft: boolean;
  metadata: Record<string, unknown>;
}

export interface PolicyResult {
  allowed: boolean;
  policy: PolicyName;
  reason: string | null;
}

export interface PolicyRule {
  name: PolicyName;
  description: string;
  evaluate(ctx: InteractionContext): PolicyResult;
}

export interface PolicyDiagnostics {
  totalEvaluations: number;
  allowed: number;
  denied: number;
  byPolicy: Record<string, { allowed: number; denied: number }>;
}
