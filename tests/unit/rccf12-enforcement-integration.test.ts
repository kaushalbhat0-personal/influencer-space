import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockWorkspaceFindFirst: vi.fn(),
  mockWorkspaceFindMany: vi.fn(),
  mockSubscriptionFindUnique: vi.fn(),
  mockSubscriptionFindMany: vi.fn(),
  mockBillingSubFindUnique: vi.fn(),
  mockBillingSubFindMany: vi.fn(),
  mockBillingSubFindFirst: vi.fn(),
  mockBillingSubUpdate: vi.fn(),
  mockBillingAccountFindUnique: vi.fn(),
  mockAgencyTenant: vi.fn(),
  mockProductCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findFirst: h.mockWorkspaceFindFirst, findMany: h.mockWorkspaceFindMany },
    subscription: { findUnique: h.mockSubscriptionFindUnique, findMany: h.mockSubscriptionFindMany },
    billingSubscription: {
      findUnique: h.mockBillingSubFindUnique,
      findMany: h.mockBillingSubFindMany,
      findFirst: h.mockBillingSubFindFirst,
      update: h.mockBillingSubUpdate,
    },
    billingAccount: { findUnique: h.mockBillingAccountFindUnique },
    agencyTenant: { findMany: h.mockAgencyTenant },
    product: { count: h.mockProductCount },
  },
}));

import { resolveActivePlan, resolvePlansForTenantIds } from "@/modules/billing/application/plan-source";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { resetPlanRestrictionCache } from "@/modules/billing/application/plan-restriction";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { entitlementService } from "@/lib/capabilities";

function sub(planCode: string, status = "ACTIVE") {
  return { id: "s1", accountId: "a1", workspaceId: "ws-1", plan: { code: planCode }, status };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPlanRestrictionCache();
  h.mockWorkspaceFindFirst.mockResolvedValue(null);
  h.mockWorkspaceFindMany.mockResolvedValue([]);
  h.mockSubscriptionFindUnique.mockResolvedValue(null);
  h.mockSubscriptionFindMany.mockResolvedValue([]);
  h.mockBillingSubFindUnique.mockResolvedValue(null);
  h.mockBillingSubFindMany.mockResolvedValue([]);
  h.mockBillingSubFindFirst.mockResolvedValue(null);
  h.mockBillingSubUpdate.mockResolvedValue({});
  h.mockBillingAccountFindUnique.mockResolvedValue(null);
  h.mockAgencyTenant.mockResolvedValue([]);
  h.mockProductCount.mockResolvedValue(0);
});

describe("RCCF-12 — canonical plan resolution across scenarios", () => {
  it("self-serve creator: workspaceId and tenantId paths agree on the v2 plan", async () => {
    h.mockWorkspaceFindFirst.mockResolvedValue({ id: "ws-1" });
    h.mockBillingSubFindUnique.mockResolvedValue(sub("creator_scale"));

    const byWs = await resolveActivePlan("ws-1", "t1");
    const byTenant = await resolveActivePlan(null, "t1");

    expect(byWs).toMatchObject({ code: "creator_scale", origin: "v2" });
    expect(byTenant).toMatchObject({ code: "creator_scale", origin: "v2" });
  });

  it("batched resolution agrees with single resolution for a self-serve creator", async () => {
    h.mockWorkspaceFindFirst.mockResolvedValue({ id: "ws-1" });
    h.mockBillingSubFindUnique.mockResolvedValue(sub("creator_scale"));
    h.mockWorkspaceFindMany.mockResolvedValue([{ id: "ws-1", tenantId: "t1" }]);
    h.mockBillingSubFindMany.mockResolvedValue([{ workspaceId: "ws-1", plan: { code: "creator_scale", name: "Creator Scale" }, status: "ACTIVE" }]);

    const single = await resolveActivePlan(null, "t1");
    const batched = await resolvePlansForTenantIds(["t1"]);

    expect(single.code).toBe("creator_scale");
    expect(batched[0]).toMatchObject({ tenantId: "t1", planCode: "creator_scale" });
  });

  it("agency-managed Launch creator is clamped to Grow consistently in both resolvers", async () => {
    h.mockAgencyTenant.mockResolvedValue([{ tenantId: "t-m" }]);
    h.mockWorkspaceFindFirst.mockResolvedValue({ id: "ws-m" });
    h.mockBillingSubFindUnique.mockResolvedValue({ ...sub("creator_launch"), workspaceId: "ws-m" });
    h.mockWorkspaceFindMany.mockResolvedValue([{ id: "ws-m", tenantId: "t-m" }]);
    h.mockBillingSubFindMany.mockResolvedValue([{ workspaceId: "ws-m", plan: { code: "creator_launch", name: "Creator Launch" }, status: "ACTIVE" }]);

    const single = await resolveActivePlan(null, "t-m");
    const batched = await resolvePlansForTenantIds(["t-m"]);

    expect(single.code).toBe("creator_grow");
    expect(batched[0]).toMatchObject({ tenantId: "t-m", planCode: "creator_grow" });
  });

  it("falls back to the legacy subscription for unmigrated creators", async () => {
    h.mockSubscriptionFindUnique.mockResolvedValue({ plan: "PRO", status: "ACTIVE" });

    const r = await resolveActivePlan(null, "t2");

    expect(r).toMatchObject({ code: "PRO", origin: "legacy", status: "ACTIVE" });
  });

  it("returns none when no subscription exists (enforcement falls back to Launch)", async () => {
    const r = await resolveActivePlan(null, "t3");
    expect(r).toMatchObject({ code: null, origin: "none" });
  });

  it("RCCF-07 linkage backfills workspaceId so the plan resolves post-provisioning", async () => {
    h.mockBillingAccountFindUnique.mockResolvedValue({ id: "acc-1" });
    h.mockBillingSubFindFirst.mockResolvedValue({ id: "sub-1", accountId: "acc-1", workspaceId: null });
    h.mockBillingSubUpdate.mockResolvedValue({ id: "sub-1", accountId: "acc-1", workspaceId: "ws-1" });

    const linked = await billingRepository.linkSubscriptionToWorkspace({
      workspaceId: "ws-1",
      accountType: "creator",
      accountId: "user-1",
    });

    expect(linked?.workspaceId).toBe("ws-1");
    expect(h.mockBillingSubUpdate).toHaveBeenCalledWith({ where: { id: "sub-1" }, data: { workspaceId: "ws-1" } });

    h.mockBillingSubFindUnique.mockResolvedValue(sub("creator_grow"));
    const resolved = await resolveActivePlan("ws-1", "t1");
    expect(resolved.code).toBe("creator_grow");
  });
});

describe("RCCF-12 — enforcement integration", () => {
  it("content limits default to the Launch limits when the tenant has no subscription", async () => {
    const over = await enforceContentLimit({ tenantId: "t3", featureKey: "max_products", used: 4 });
    const under = await enforceContentLimit({ tenantId: "t3", featureKey: "max_products", used: 2 });

    expect(over.ok).toBe(false);
    expect(over.limit).toBe(3);
    expect(under.ok).toBe(true);
  });

  it("capability grants match the enforcement boundaries across the plan ladder", () => {
    const has = (code: string, cap: string) => entitlementService.has(code, cap);

    expect(has("creator_launch", "premium_themes")).toBe(false);
    expect(has("creator_launch", "custom_domain")).toBe(false);
    expect(has("creator_launch", "live_social_sync")).toBe(false);

    expect(has("creator_grow", "premium_themes")).toBe(true);
    expect(has("creator_grow", "custom_domain")).toBe(false);
    expect(has("creator_grow", "live_social_sync")).toBe(false);

    expect(has("creator_scale", "premium_themes")).toBe(true);
    expect(has("creator_scale", "custom_domain")).toBe(true);
    expect(has("creator_scale", "live_social_sync")).toBe(true);
    expect(has("creator_scale", "analytics_advanced")).toBe(true);

    expect(has("creator_enterprise", "custom_domain")).toBe(true);
    // Config asymmetry (reported, not changed): Enterprise lacks the Scale-only
    // webhooks/live_social_sync grants even though it is the top creator plan.
    expect(has("creator_enterprise", "live_social_sync")).toBe(false);
    expect(has("creator_enterprise", "webhooks")).toBe(false);
    expect(has("creator_enterprise", "api_access")).toBe(true);

    expect(has("partner_free", "premium_themes")).toBe(false);
    expect(has("partner_solo", "premium_themes")).toBe(true);
    expect(has("partner_solo", "custom_domain")).toBe(true);
  });
});