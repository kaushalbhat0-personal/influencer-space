// ── AI Assist Contract (Phase 8) ────────────────────────────
// AI only ASSISTS. It never invents facts. This contract defines exactly what
// assistance is allowed and what is prohibited. The Completion Runtime itself
// makes zero AI calls; any assist request is validated against this boundary
// before an AI provider could ever be invoked (and, unless a creator
// explicitly requests assistance, no AI call is made at all).

export type AssistOperation = "rewrite" | "summarize" | "improve" | "expand";

export const ALLOWED_ASSIST_OPERATIONS: AssistOperation[] = ["rewrite", "summarize", "improve", "expand"];

/** Facts AI must NEVER create. Only the creator can supply these. */
export const PROHIBITED_ASSIST_OPERATIONS = [
  "guess_products",
  "invent_achievements",
  "create_fake_testimonials",
  "infer_pricing",
] as const;

export type ProhibitedOperation = (typeof PROHIBITED_ASSIST_OPERATIONS)[number];

/** Fields whose source is user-confirmed reality — AI may not touch them. */
export const FACT_ONLY_FIELDS = [
  "commerce.products",
  "commerce.pricing",
  "trust.testimonials",
  "trust.achievements",
  "social.affiliateLinks",
  "creator.affiliateLinks",
] as const;

export interface AssistRequest {
  operation: AssistOperation;
  /** Target registry field id (e.g. "brand.bio"). */
  fieldId: string;
  /** Existing value the creator wrote. */
  value?: string;
  /** Extra deterministic context (e.g. niche, name) — never fabricated. */
  context?: string;
}

export interface AssistDecision {
  allowed: boolean;
  reason: string;
  /**
   * Deterministic, offline transformation that may be applied when the
   * operation cannot (or should not) reach an AI provider. Keeps assistance
   * useful without increasing AI cost.
   */
  deterministicTransform?: (value: string) => string;
}

function deterministicFor(operation: AssistOperation): ((value: string) => string) | undefined {
  switch (operation) {
    case "summarize":
      return (value: string) => {
        const text = value.trim();
        if (text.length <= 140) return text;
        return `${text.slice(0, 137).replace(/\s+\S*$/, "")}…`;
      };
    case "improve":
      return (value: string) => value.trim().replace(/\s{2,}/g, " ").replace(/^./, (c) => c.toUpperCase());
    default:
      return undefined;
  }
}

/**
 * Validate a proposed assist against the boundary. The runtime never calls AI
 * on its own; callers invoke this first and only proceed when `allowed`.
 */
export function resolveAssist(request: AssistRequest): AssistDecision {
  const field = FACT_ONLY_FIELDS.find((id) => id === request.fieldId);
  if (field) {
    return { allowed: false, reason: `${request.fieldId} is a fact-only field — AI may never invent or alter it.` };
  }

  if (!ALLOWED_ASSIST_OPERATIONS.includes(request.operation)) {
    return { allowed: false, reason: `Operation "${request.operation}" is not an allowed assist.` };
  }

  if (!request.value || request.value.trim().length < 2) {
    return {
      allowed: false,
      reason: "Assist requires an existing value written by the creator — the runtime never starts from nothing.",
    };
  }

  return {
    allowed: true,
    reason: `Assist "${request.operation}" on ${request.fieldId} respects the AI boundary.`,
    deterministicTransform: deterministicFor(request.operation),
  };
}
