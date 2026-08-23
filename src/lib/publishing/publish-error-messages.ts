/**
 * RCCF-70.6.5.3 — canonical publishing failure presentation.
 *
 * A PURE function that translates the existing server-side publish result into
 * creator-facing copy + an optional next-step action. It makes NO I/O of any
 * kind: no prisma, no server actions, no session, no tenant/capability/billing
 * lookups, no network. The server remains the ONLY authority — this module only
 * interprets fields the server already returned.
 *
 * Rules:
 *  - Only coded failures (PUBLISH_QUOTA_EXCEEDED, PUBLISH_TRIAL_EXPIRED) are
 *    converted into friendly product copy.
 *  - Known product-readable failures pass through unchanged.
 *  - Unknown/technical failures collapse to a safe generic message. Raw
 *    Prisma/SQL/provider text is never rendered.
 *  - No plan limits are hardcoded here; every number comes from the result.
 */

export type PublishUpgradeTier = "growth" | "scale";

/** Minimal server-result shape the translator reads. Superset results (e.g.
 * PublishActionResult) are structurally assignable. */
export interface PublishFailureResult {
  success: boolean;
  error?: string;
  code?: string;
  used?: number;
  limit?: number;
  periodEnd?: string | null;
  mode?: string;
  suggestedUpgrade?: PublishUpgradeTier | null;
}

export interface PublishFailureAction {
  label: string;
  href: string;
}

export interface PublishFailurePresentation {
  message: string;
  action?: PublishFailureAction;
  severity: "info" | "warning" | "error";
}

/** Canonical upgrade destination — the existing billing flow, never invented. */
export const UPGRADE_ROUTE = "/admin/billing";

const TIER_LABELS: Record<PublishUpgradeTier, string> = {
  growth: "Growth",
  scale: "Scale",
};

function tierLabel(tier: PublishUpgradeTier | null | undefined): string | null {
  if (tier === "growth" || tier === "scale") return TIER_LABELS[tier];
  return null;
}

function upgradeAction(tier: PublishUpgradeTier | null | undefined): PublishFailureAction | undefined {
  const label = tierLabel(tier);
  if (!label) return undefined;
  return { label: `Upgrade to ${label}`, href: UPGRADE_ROUTE };
}

/**
 * Conservative technical-error classifier. Any hit collapses the failure to the
 * safe generic message. When in doubt, prefer the generic message (never leak
 * raw provider/DB internals to creators). Known product sentences never contain
 * these tokens, so valid copy is preserved.
 */
const TECHNICAL_HINTS = [
  "prisma",
  "sql",
  "database",
  "relation",
  "query",
  "connection",
  "network",
  "socket",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "eaddrinfo",
  "timeout",
  "timed out",
  "postgres",
  "pg:",
  "provider",
  "transaction is aborted",
  "commands ignored",
  "aborted",
  "stack trace",
  "internal server error",
  "unhandled",
  "constraint",
  "foreign key",
  "unique constraint",
  "error:",
  "typeerror",
  "referenceerror",
  "is not a function",
  "is not defined",
  "cannot read properties",
  "cannot read property",
  "cannot destructure",
  "undefined is not",
  "null is not",
  "failed to parse",
  "failed to fetch",
];

function isTechnicalError(message: string): boolean {
  const lower = message.toLowerCase();
  return TECHNICAL_HINTS.some((hint) => lower.includes(hint));
}

/**
 * Translate a server publish failure into a presentation model.
 * Only the fields the server returned are ever read.
 */
export function getPublishFailurePresentation(
  result: PublishFailureResult,
): PublishFailurePresentation {
  const action = upgradeAction(result.suggestedUpgrade);

  if (result.code === "PUBLISH_QUOTA_EXCEEDED") {
    const limit = typeof result.limit === "number" ? result.limit : null;
    const used = typeof result.used === "number" ? result.used : null;

    // limit <= 0 means publishing is simply not available under the current
    // configuration. Never surface a "0/0" as the primary explanation.
    if (limit !== null && limit <= 0) {
      return {
        severity: "warning",
        message: "Publishing isn't available on your current plan.",
        action,
      };
    }

    if (result.mode === "monthly") {
      const message = action
        ? "You've reached your publish limit for this billing period. You can upgrade now or continue when your publishing allowance resets."
        : "You've reached your publish limit for this billing period. You can continue when your publishing allowance resets.";
      return { severity: "warning", message, action };
    }

    // Lifetime (and any non-monthly quota): Launch → Growth → Scale.
    if (limit !== null && used !== null) {
      return {
        severity: "warning",
        message: action
          ? `You've used all ${limit} publishes available on your current plan. Upgrade to keep publishing.`
          : `You've used all ${limit} publishes available on your current plan.`,
        action,
      };
    }
    return {
      severity: "warning",
      message: "You've reached the publish limit for your current plan.",
      action,
    };
  }

  if (result.code === "PUBLISH_TRIAL_EXPIRED") {
    return {
      severity: "warning",
      message: action
        ? "Your trial has ended. Your website remains live, but publishing new changes requires an active subscription. Upgrade to continue publishing."
        : "Your trial has ended. Your website remains live, but publishing new changes requires an active subscription.",
      action,
    };
  }

  const raw = typeof result.error === "string" ? result.error.trim() : "";
  if (raw.length > 0 && !isTechnicalError(raw)) {
    // Known product-readable failure — preserve it verbatim.
    return { severity: "error", message: raw };
  }

  // Unknown or clearly technical — safe generic message, no internals leaked.
  return { severity: "error", message: "Publishing failed. Please try again." };
}