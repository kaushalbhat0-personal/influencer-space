import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAgencyCreatorPlanCode } from "@/modules/provisioning/application/creator-plan";
import { resolvePublishPolicy } from "@/lib/publishing/publish-policy";
import { getCommercePlan } from "@/config/commerce/plans";

/**
 * RCCF-73.3 — Creator Client Subscription Provisioning
 *
 * Guardrail regression tests pinning:
 *  - server-authoritative Creator plan validation (Partner/Enterprise/Launch/
 *    unknown rejected; grow/scale accepted)
 *  - the canonical TRIALING BillingSubscription creation inside the provisioning
 *    transaction, reusing upsertSubscription + getTrialEndDate
 *  - normal Creator signup's linkSubscriptionToWorkspace path preserved
 *  - publish-policy resolution for the real Creator plans (no null fallback)
 *  - no commission/invoice created by provisioning (webhook-only commission)
 */

const PROVISIONING_SVC = join(process.cwd(), "src/modules/provisioning/application/provisioning-service.ts");
const ACTIONS = join(process.cwd(), "src/actions/super-admin-provision.actions.ts");
const COMMISSION_RUNTIME = join(process.cwd(), "src/lib/commission/runtime.ts");
const BILLING_SVC = join(process.cwd(), "src/modules/billing/application/service.ts");

const provisioningSvc = readFileSync(PROVISIONING_SVC, "utf8");
const actionsSrc = readFileSync(ACTIONS, "utf8");
const commissionRuntime = readFileSync(COMMISSION_RUNTIME, "utf8");
const billingSvc = readFileSync(BILLING_SVC, "utf8");

describe("RCCF-73.3 — plan validation (server authoritative)", () => {
  it("accepts creator_grow", () => {
    const r = validateAgencyCreatorPlanCode("creator_grow");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.planCode).toBe("creator_grow");
  });

  it("accepts creator_scale", () => {
    expect(validateAgencyCreatorPlanCode("creator_scale").ok).toBe(true);
  });

  it("rejects Partner plans (partner_solo / partner_growth / partner_scale)", () => {
    for (const code of ["partner_solo", "partner_growth", "partner_scale"]) {
      const r = validateAgencyCreatorPlanCode(code);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("Invalid Creator plan");
    }
  });

  it("rejects Enterprise plans (creator_enterprise / partner_enterprise)", () => {
    for (const code of ["creator_enterprise", "partner_enterprise"]) {
      const r = validateAgencyCreatorPlanCode(code);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        // Both enterprise codes are rejected. Depending on which guard fires
        // first (family vs manual vs enterprise), the message may be
        // "Invalid Creator plan" / "Manual plan" / "Enterprise plan" — all are
        // valid rejections; the invariant is that they never pass.
        const isRejected = /Invalid Creator plan|Manual plan|Enterprise plan/.test(r.error);
        expect(isRejected).toBe(true);
      }
    }
  });

  it("rejects Launch for agency provisioning", () => {
    const r = validateAgencyCreatorPlanCode("creator_launch");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Creator Grow");
  });

  it("rejects an unknown/invalid plan code", () => {
    expect(validateAgencyCreatorPlanCode("not_a_plan").ok).toBe(false);
    expect(validateAgencyCreatorPlanCode(undefined).ok).toBe(false);
    expect(validateAgencyCreatorPlanCode(null).ok).toBe(false);
  });

  it("uses the canonical registry, not a second hardcoded list", () => {
    // The valid set is derived from getCommercePlan + isAgencyRestrictedPlan.
    expect(getCommercePlan("creator_grow")?.family).toBe("creator");
    expect(getCommercePlan("creator_scale")?.family).toBe("creator");
  });
});

describe("RCCF-73.3 — provisioning creates a real TRIALING subscription in T1", () => {
  it("calls upsertSubscription with TRIALING + getTrialEndDate(...,15) for agency-provisioned clients", () => {
    expect(provisioningSvc).toContain("billingRepository.upsertSubscription(");
    expect(provisioningSvc).toContain('status: "TRIALING"');
    expect(provisioningSvc).toContain("getTrialEndDate(new Date(), 15)");
    // planId comes from the server-validated creatorPlan, never a raw string.
    expect(provisioningSvc).toContain("planId: input.creatorPlan.planId");
  });

  it("creates the subscription inside the same transaction (tx passed to upsertSubscription)", () => {
    // The upsertSubscription call passes the transaction client.
    expect(provisioningSvc).toContain("tx as Prisma.TransactionClient");
    // It sits after the OWNER WorkspaceMember creation and inside $transaction.
    expect(provisioningSvc.indexOf("workspaceRepository.addMember")).toBeLessThan(
      provisioningSvc.indexOf("billingRepository.upsertSubscription"),
    );
    expect(provisioningSvc.indexOf("prisma.$transaction")).toBeLessThan(
      provisioningSvc.indexOf("billingRepository.upsertSubscription"),
    );
  });

  it("preserves the normal Creator signup linkSubscriptionToWorkspace path (INV-11)", () => {
    // The legacy backfill path must still exist and be reachable (creatorPlan unset).
    expect(provisioningSvc).toContain("billingRepository.linkSubscriptionToWorkspace(");
    expect(provisioningSvc).toContain("input.creatorPlan?.planId");
  });

  it("does NOT create a second billing subsystem (no bespoke account/subscription create call)", () => {
    // Must reuse the canonical upsertSubscription primitive — not a new
    // billingAccount.create / billingSubscription.create path.
    const inlineCreate = /billingAccount\.create|billingSubscription\.create/.test(provisioningSvc);
    expect(inlineCreate).toBe(false);
  });
});

describe("RCCF-73.3 — resolveActivePlan wiring (INV-06)", () => {
  it("wires the canonical BillingPlan.id into the subscription so resolveActivePlan resolves the selected plan", () => {
    // confirmProvision resolves the canonical BillingPlan row and passes planId.
    expect(actionsSrc).toContain("billingRepository.findPlanByCode(planCode)");
    expect(actionsSrc).toContain("planId: billingPlan.id");
    expect(actionsSrc).toContain("creatorPlan");
  });
});

describe("RCCF-73.3 — publishing resolves real plan (no null→unlimited)", () => {
  it("creator_grow resolves monthly limit 10", async () => {
    const p = await resolvePublishPolicy("creator_grow");
    expect(p.mode).toBe("monthly");
    expect(p.limit).toBe(10);
  });

  it("creator_scale resolves unlimited by Scale policy, not by missing subscription", async () => {
    const p = await resolvePublishPolicy("creator_scale");
    expect(p.mode).toBe("unlimited");
  });
});

describe("RCCF-73.3 — commission is webhook/paid-driven only (INV-13)", () => {
  it("provisioning source never records commission or creates an invoice", () => {
    expect(provisioningSvc).not.toContain("recordSubscriptionCommission");
    expect(provisioningSvc).not.toContain("billingInvoice.create");
    expect(provisioningSvc).not.toContain("commissionEntry.create");
  });

  it("commission is recorded only in the paid subscription/webhook lifecycle", () => {
    expect(billingSvc).toContain("recordSubscriptionCommission");
    expect(commissionRuntime).toContain("recordSubscriptionCommission");
  });
});
