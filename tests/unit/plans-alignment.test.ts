import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ agencyTenantFindMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { agencyTenant: { findMany: h.agencyTenantFindMany } },
}));

import {
  getCreatorCommercePlans,
  getPartnerCommercePlans,
  getCommercePlan,
  isAgencyRestrictedPlan,
  minEligiblePlanForAgencyCreator,
  MIN_PLAN_FOR_AGENCY_CREATORS,
  LEGACY_TO_CANONICAL,
} from "@/config/commerce/plans";
import { assertEligiblePlan, resolveRestrictedPlanCode, resetPlanRestrictionCache } from "@/modules/billing/application/plan-restriction";
import { getFeatureGroups, groupForFeature } from "@/lib/capabilities/features";

beforeEach(() => {
  h.agencyTenantFindMany.mockReset();
  h.agencyTenantFindMany.mockResolvedValue([]);
  resetPlanRestrictionCache();
});

describe("IMPLEMENTATION-42 — Canonical commerce config (Phase 1/2/3)", () => {
  it("defines the four creator plans with canonical prices", () => {
    const creator = getCreatorCommercePlans();
    expect(creator.map((p) => p.code)).toEqual(["creator_launch", "creator_grow", "creator_scale", "creator_enterprise"]);
    expect(getCommercePlan("creator_launch")?.price).toBe(0);
    expect(getCommercePlan("creator_grow")?.price).toBe(999);
    expect(getCommercePlan("creator_scale")?.price).toBe(1995);
    expect(getCommercePlan("creator_enterprise")?.price).toBeNull();
  });

  it("defines the four partner plans with canonical prices (RCCF-MKT-04-R1)", () => {
    const partner = getPartnerCommercePlans();
    expect(partner.map((p) => p.code)).toEqual(["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]);
    expect(getCommercePlan("partner_free")?.price).toBe(0);
    expect(getCommercePlan("partner_solo")?.price).toBe(4999);
    expect(getCommercePlan("partner_scale")?.price).toBe(7999);
    expect(getCommercePlan("partner_enterprise")?.price).toBe(14999);
    // Only Solo carries "Recommended" (a product decision, not fabricated).
    expect(getCommercePlan("partner_solo")?.badge).toBe("Recommended");
    // RCCF-MKT-04-R1: Partner Growth is fully removed from the registry.
    expect(getCommercePlan("partner_growth")).toBeUndefined();
  });

  it("keeps legacy agency mapping internal only", () => {
    expect(LEGACY_TO_CANONICAL.agency_free).toBe("partner_free");
    expect(LEGACY_TO_CANONICAL.agency_studio).toBe("partner_solo");
    // RCCF-MKT-04-R1: the agency_agency → partner_growth alias is removed.
    expect(LEGACY_TO_CANONICAL.agency_agency).toBeUndefined();
  });

  it("RCCF-28: Creator Enterprise is a strict superset of Creator Scale", () => {
    const scale = getCreatorCommercePlans().find((p) => p.code === "creator_scale");
    const enterprise = getCreatorCommercePlans().find((p) => p.code === "creator_enterprise");
    expect(scale).toBeDefined();
    expect(enterprise).toBeDefined();
    for (const cap of scale!.capabilities) {
      expect(enterprise!.capabilities).toContain(cap);
    }
  });

  it("RCCF-35: custom domain is Launch/Growth-off and Scale/Enterprise-on (marketing FAQ invariant)", () => {
    const plans = new Map(getCreatorCommercePlans().map((p) => [p.code, p]));
    expect(plans.get("creator_launch")!.capabilities).not.toContain("custom_domain");
    expect(plans.get("creator_grow")!.capabilities).not.toContain("custom_domain");
    expect(plans.get("creator_scale")!.capabilities).toContain("custom_domain");
    expect(plans.get("creator_enterprise")!.capabilities).toContain("custom_domain");
  });

  it("RCCF-35: marketing highlights do not claim unimplemented features", () => {
    const scale = getCommercePlan("creator_scale")!;
    const growth = getCommercePlan("creator_grow")!;
    const enterprise = getCommercePlan("creator_enterprise")!;

    for (const h of scale.marketingHighlights ?? []) {
      expect(h).not.toMatch(/Automation|Advanced commerce|CRM integrations|Faster AI generation queue/);
    }
    for (const h of growth.marketingHighlights ?? []) {
      expect(h).not.toMatch(/Premium components/);
      if (h.includes("AI credits")) expect(h).toContain("coming soon");
    }
    for (const h of enterprise.marketingHighlights ?? []) {
      expect(h).not.toMatch(/SLA guarantee|SSO/);
    }
  });
});

describe("IMPLEMENTATION-42 — Agency creator restriction (Phase 5)", () => {
  it("flags Launch as restricted and resolves the minimum to Grow", () => {
    expect(isAgencyRestrictedPlan("creator_launch")).toBe(true);
    expect(isAgencyRestrictedPlan("creator_free")).toBe(true);
    expect(isAgencyRestrictedPlan("creator_grow")).toBe(false);
    expect(isAgencyRestrictedPlan("creator_scale")).toBe(false);
    expect(MIN_PLAN_FOR_AGENCY_CREATORS).toBe("creator_grow");
    expect(minEligiblePlanForAgencyCreator("creator_launch")).toBe("creator_grow");
    expect(minEligiblePlanForAgencyCreator("creator_scale")).toBe("creator_scale");
  });

  it("assertEligiblePlan rejects Launch for an agency-managed tenant", async () => {
    h.agencyTenantFindMany.mockResolvedValue([{ tenantId: "t-agency" }]);
    const rejected = await assertEligiblePlan({ tenantId: "t-agency", planCode: "creator_launch" });
    expect(rejected.ok).toBe(false);
    expect(rejected.error).toContain("Creator Grow");

    const allowed = await assertEligiblePlan({ tenantId: "t-agency", planCode: "creator_grow" });
    expect(allowed.ok).toBe(true);
  });

  it("allows Launch for an independent (non-managed) tenant", async () => {
    h.agencyTenantFindMany.mockResolvedValue([{ tenantId: "t-other" }]);
    const allowed = await assertEligiblePlan({ tenantId: "t-independent", planCode: "creator_launch" });
    expect(allowed.ok).toBe(true);
    expect(allowed.effectiveCode).toBe("creator_launch");
  });

  it("resolveRestrictedPlanCode clamps Launch → Grow only for managed tenants", async () => {
    h.agencyTenantFindMany.mockResolvedValue([{ tenantId: "t-m" }]);
    expect(await resolveRestrictedPlanCode({ tenantId: "t-m", code: "creator_launch" })).toBe("creator_grow");
    expect(await resolveRestrictedPlanCode({ tenantId: "t-m", code: "creator_scale" })).toBe("creator_scale");
    h.agencyTenantFindMany.mockResolvedValue([]);
    expect(await resolveRestrictedPlanCode({ tenantId: "t-free", code: "creator_launch" })).toBe("creator_launch");
  });
});

describe("IMPLEMENTATION-42 — Capability matrix grouping (Phase 10)", () => {
  it("groups features into logical categories", () => {
    const groups = getFeatureGroups();
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Website");
    expect(labels).toContain("Commerce");
    expect(labels).toContain("Builder");
    expect(labels).toContain("AI");
    expect(labels).toContain("Analytics");
    expect(labels).toContain("Storage");
    expect(groupForFeature("custom_domain")).toBe("domain");
    expect(groupForFeature("max_products")).toBe("commerce");
    expect(groupForFeature("premium_themes")).toBe("builder");
  });
});
