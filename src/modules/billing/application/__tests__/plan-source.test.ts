import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindSub, mockWorkspace, mockLegacy, mockV2Many, mockLegacyMany, mockWorkspaceMany, mockAgencyTenant } = vi.hoisted(() => ({
  mockFindSub: vi.fn(),
  mockWorkspace: vi.fn(),
  mockLegacy: vi.fn(),
  mockV2Many: vi.fn(),
  mockLegacyMany: vi.fn(),
  mockWorkspaceMany: vi.fn(),
  mockAgencyTenant: vi.fn(),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { findSubscriptionWithPlan: mockFindSub },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findFirst: mockWorkspace, findMany: mockWorkspaceMany },
    subscription: {
      findUnique: mockLegacy,
      findMany: mockLegacyMany,
    },
    billingSubscription: { findMany: mockV2Many },
    agencyTenant: { findMany: mockAgencyTenant },
  },
}));

import { resolveActivePlan, listAllSubscriptions, resolvePlansForTenantIds } from "@/modules/billing/application/plan-source";
import { resetPlanRestrictionCache } from "@/modules/billing/application/plan-restriction";

beforeEach(() => {
  vi.clearAllMocks();
  resetPlanRestrictionCache();
  mockFindSub.mockResolvedValue(null);
  mockWorkspace.mockResolvedValue(null);
  mockLegacy.mockResolvedValue(null);
  mockV2Many.mockResolvedValue([]);
  mockLegacyMany.mockResolvedValue([]);
  mockWorkspaceMany.mockResolvedValue([]);
  mockAgencyTenant.mockResolvedValue([]);
});

describe("resolveActivePlan — Billing v2 first, legacy fallback", () => {
  it("returns the v2 plan code when the workspace has a BillingSubscription", async () => {
    mockFindSub.mockResolvedValue({ plan: { code: "creator_pro" }, status: "ACTIVE" });
    const r = await resolveActivePlan("ws-1", "tenant-1");
    expect(r.code).toBe("creator_pro");
    expect(r.origin).toBe("v2");
    expect(r.status).toBe("ACTIVE");
  });

  it("resolves v2 via the tenant's workspace when only tenantId is given", async () => {
    mockWorkspace.mockResolvedValue({ id: "ws-2" });
    mockFindSub.mockResolvedValue({ plan: { code: "agency_studio" }, status: "TRIALING" });
    const r = await resolveActivePlan(null, "tenant-2");
    expect(r.code).toBe("agency_studio");
    expect(r.origin).toBe("v2");
    expect(mockWorkspace).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "tenant-2" } }));
  });

  it("falls back to the legacy Subscription table for unmigrated tenants", async () => {
    mockWorkspace.mockResolvedValue(null); // no workspace
    mockLegacy.mockResolvedValue({ plan: "PRO", status: "ACTIVE" });
    const r = await resolveActivePlan(null, "tenant-3");
    expect(r.code).toBe("PRO");
    expect(r.origin).toBe("legacy");
    expect(r.status).toBe("ACTIVE");
  });

  it("returns none when no subscription exists", async () => {
    const r = await resolveActivePlan(null, "tenant-4");
    expect(r.code).toBeNull();
    expect(r.origin).toBe("none");
    expect(r.status).toBeNull();
  });

  it.each(["CANCELLED", "EXPIRED", "PAST_DUE"])("does not resolve an inactive v2 %s plan", async (status) => {
    mockWorkspace.mockResolvedValue({ id: "ws-inactive" });
    mockFindSub.mockResolvedValue({ plan: { code: "creator_grow" }, status });
    mockLegacy.mockResolvedValue({ plan: "PRO", status: "ACTIVE", currentPeriodEnd: null });

    const r = await resolveActivePlan(null, "tenant-inactive");

    expect(r).toMatchObject({ code: null, origin: "v2", status });
  });

  it("does not resolve an ended v2 trial", async () => {
    mockWorkspace.mockResolvedValue({ id: "ws-trial" });
    mockFindSub.mockResolvedValue({
      plan: { code: "creator_grow" },
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() - 1),
    });

    const r = await resolveActivePlan(null, "tenant-trial");

    expect(r).toMatchObject({ code: null, origin: "v2", status: "TRIALING" });
  });

  it("applies the effective period to legacy subscriptions", async () => {
    mockLegacy.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() - 1),
    });

    const r = await resolveActivePlan(null, "tenant-legacy-expired");

    expect(r).toMatchObject({ code: null, origin: "legacy", status: "ACTIVE" });
  });
});

describe("listAllSubscriptions — v2 + legacy union without duplication", () => {
  it("returns v2 rows and only legacy rows for tenants without v2", async () => {
    mockV2Many.mockResolvedValue([
      { accountId: "ws-a", plan: { code: "creator_pro", name: "Pro" }, workspace: { tenant: { id: "t1", name: "One" } }, status: "ACTIVE", renewsAt: new Date("2026-01-01") },
      { accountId: "ws-b", plan: { code: "creator_free", name: "Starter" }, workspace: { tenant: { id: "t2", name: "Two" } }, status: "TRIALING", renewsAt: null },
    ]);
    mockLegacyMany.mockResolvedValue([
      { tenantId: "t2", plan: "PRO", status: "ACTIVE", currentPeriodEnd: null, tenant: { name: "Two" } }, // t2 already v2 → skipped
      { tenantId: "t3", plan: "STARTER", status: "FREE", currentPeriodEnd: null, tenant: { name: "Three" } }, // legacy-only → kept
    ]);
    const rows = await listAllSubscriptions();
    expect(rows).toHaveLength(3);
    const t2rows = rows.filter((r) => r.tenantId === "t2");
    expect(t2rows).toHaveLength(1);
    expect(t2rows[0]?.origin).toBe("v2"); // v2 wins for t2
    const t3 = rows.find((r) => r.tenantId === "t3");
    expect(t3?.origin).toBe("legacy");
    expect(t3?.planCode).toBe("STARTER");
    expect(t3?.planDisplay).toBe("Creator Launch");
  });
});

describe("resolvePlansForTenantIds — batched resolution applies the agency clamp", () => {
  it("returns v2 codes unchanged for non-managed tenants", async () => {
    mockWorkspaceMany.mockResolvedValue([{ id: "ws-1", tenantId: "t1" }]);
    mockV2Many.mockResolvedValue([{ workspaceId: "ws-1", plan: { code: "creator_launch", name: "Creator Launch" }, status: "ACTIVE" }]);

    const rows = await resolvePlansForTenantIds(["t1"]);

    expect(rows[0]).toMatchObject({ tenantId: "t1", planCode: "creator_launch", origin: "v2", status: "ACTIVE" });
  });

  it("clamps agency-managed v2 tenants from Launch to Grow", async () => {
    mockWorkspaceMany.mockResolvedValue([{ id: "ws-1", tenantId: "t1" }]);
    mockV2Many.mockResolvedValue([{ workspaceId: "ws-1", plan: { code: "creator_launch", name: "Creator Launch" }, status: "ACTIVE" }]);
    mockAgencyTenant.mockResolvedValue([{ tenantId: "t1" }]);

    const rows = await resolvePlansForTenantIds(["t1"]);

    expect(rows[0]).toMatchObject({ tenantId: "t1", planCode: "creator_grow", planDisplay: "Creator Growth", origin: "v2" });
  });

  it("clamps legacy agency-managed tenants via canonical resolution", async () => {
    mockLegacyMany.mockResolvedValue([{ tenantId: "t2", plan: "creator_free", status: "ACTIVE" }]);
    mockAgencyTenant.mockResolvedValue([{ tenantId: "t2" }]);

    const rows = await resolvePlansForTenantIds(["t2"]);

    expect(rows[0]).toMatchObject({ tenantId: "t2", planCode: "creator_grow", planDisplay: "Creator Growth", origin: "legacy" });
  });

  it("returns Free/None for tenants without a subscription", async () => {
    const rows = await resolvePlansForTenantIds(["t3"]);
    expect(rows[0]).toMatchObject({ tenantId: "t3", planCode: null, planDisplay: "Free", origin: "none" });
  });

  it("returns an empty array for an empty input", async () => {
    await expect(resolvePlansForTenantIds([])).resolves.toEqual([]);
  });
});
