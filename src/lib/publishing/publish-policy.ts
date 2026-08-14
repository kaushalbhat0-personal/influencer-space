/**
 * RCCF-31 — canonical publish-quota policy for the individual Creator plans.
 *
 * Defaults are code-defined; Super Admin can override the policy per plan via
 * `BillingPlan.runtimeConfig.publishing` (surfaced through the pricing runtime,
 * the same canonical source marketing reads). The publish metering path resolves
 * the policy through this module so marketing, plan config, and runtime
 * enforcement all agree.
 */
import { getRuntimePlan } from "@/modules/pricing/application/runtime";
import { LEGACY_TO_CANONICAL } from "@/config/commerce/plans";

export type PublishMode = "lifetime" | "monthly" | "unlimited";

export interface PublishPolicy {
  mode: PublishMode;
  /** Successful publishes allowed per the period window; null for unlimited. */
  limit: number | null;
}

export const DEFAULT_PUBLISH_POLICIES: Record<string, PublishPolicy> = {
  creator_launch: { mode: "lifetime", limit: 3 },
  creator_grow: { mode: "monthly", limit: 10 },
  creator_scale: { mode: "unlimited", limit: null },
  creator_enterprise: { mode: "unlimited", limit: null },
};

export function isUnlimitedPublishPlan(code: string | null | undefined): boolean {
  const canonical = canonicalPlanCode(code);
  return DEFAULT_PUBLISH_POLICIES[canonical]?.mode === "unlimited";
}

function canonicalPlanCode(code: string | null | undefined): string {
  if (!code) return "";
  return LEGACY_TO_CANONICAL[code] ?? code;
}

/** Commercial publish-quota upgrade path: Launch → Growth → Scale. */
export function suggestedPublishUpgrade(code: string | null | undefined): "growth" | "scale" | null {
  const canonical = canonicalPlanCode(code);
  if (canonical === "creator_launch") return "growth";
  if (canonical === "creator_grow") return "scale";
  return null;
}

/**
 * Resolve the effective publish policy for a plan code. Static defaults first,
 * then any Super Admin `runtimeConfig.publishing` override (surfaced via the
 * pricing runtime — the same source marketing displays).
 *
 * RCCF-36 hardening: a valid override is exactly { lifetime | monthly, limit ≥ 0 }
 * or { unlimited }. `limit: 0` is a VALID intent ("publishing blocked"). Anything
 * else (invalid mode, negative/NaN/non-integer limit) is treated as malformed and
 * falls back to the canonical default — malformed config can never bypass quota.
 */
export async function resolvePublishPolicy(code: string | null | undefined): Promise<PublishPolicy> {
  const canonical = canonicalPlanCode(code);
  const defaults: PublishPolicy = DEFAULT_PUBLISH_POLICIES[canonical] ?? { mode: "unlimited", limit: null };

  try {
    const plan = await getRuntimePlan(canonical);
    const p = plan?.publishing;
    if (p) {
      if (p.mode === "unlimited") return { mode: "unlimited", limit: null };
      if (p.mode === "lifetime" || p.mode === "monthly") {
        if (typeof p.limit === "number" && Number.isInteger(p.limit) && p.limit >= 0) {
          return { mode: p.mode, limit: p.limit };
        }
        return defaults;
      }
      return defaults;
    }
  } catch {
    // runtime config unavailable — fall back to static defaults
  }

  return defaults;
}
