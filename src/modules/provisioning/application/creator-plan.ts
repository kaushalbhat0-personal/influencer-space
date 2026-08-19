/**
 * RCCF-73.3 — pure, server-authoritative validation of the Creator plan an
 * agency may provision for a client.
 *
 * The client supplies only a plan code; the server resolves the canonical
 * commerce registry (`src/config/commerce/plans.ts`) and rejects anything that
 * is not a non-manual, non-enterprise, non-Launch Creator plan. Partner plans
 * (partner_growth / partner_solo / partner_scale), Enterprise plans
 * (creator_enterprise / partner_enterprise), manual plans, Creator Launch, and
 * unknown codes are all rejected.
 *
 * Pure (no DB, no "use server" boundary) so it is exhaustively testable and can
 * be reused as a defense-in-depth gate. It never trusts the raw string for
 * entitlement — the caller must resolve the canonical BillingPlan.id separately.
 */
import { getCommercePlan, isAgencyRestrictedPlan } from "@/config/commerce/plans";

export type AgencyCreatorPlanValidation =
  | { ok: true; planCode: string }
  | { ok: false; error: string };

export function validateAgencyCreatorPlanCode(planCode: string | undefined | null): AgencyCreatorPlanValidation {
  if (!planCode) return { ok: false, error: "Invalid plan: " + String(planCode) };
  const commercePlan = getCommercePlan(planCode);
  if (!commercePlan) return { ok: false, error: `Invalid plan: ${planCode}` };
  if (commercePlan.family !== "creator") return { ok: false, error: `Invalid Creator plan: ${planCode}` };
  if (commercePlan.manual) return { ok: false, error: `Manual plan is not available for Creator provisioning: ${planCode}` };
  if (commercePlan.enterprise) return { ok: false, error: `Enterprise plan is not available for Creator provisioning: ${planCode}` };
  if (isAgencyRestrictedPlan(planCode)) {
    return { ok: false, error: "Agency-managed creators require at least Creator Grow — Creator Launch is not available." };
  }
  return { ok: true, planCode };
}
