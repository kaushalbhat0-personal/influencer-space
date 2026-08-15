import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared state for savePlanConfig (billingPlan/planPricingVersion) and for the
// atomic capacity enforcement (agencyTenant/workspace/websiteAgency).
const v = vi.hoisted(() => {
  const links: Array<{ id: string; agencyId: string; tenantId: string; status: string }> = [];
  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };
  const activeCount = (agencyId: string) => links.filter((l) => l.agencyId === agencyId && l.status === "ACTIVE").length;
  return {
    mockGetServerSession: vi.fn(),
    mockUpsert: vi.fn(),
    mockFindUnique: vi.fn(),
    mockVersionCreate: vi.fn(),
    mockResetCache: vi.fn(),
    mockLogAction: vi.fn(),
    mockPlansCreate: vi.fn(),
    mockAgencyFindUnique: vi.fn(),
    mockWorkspaceFindUnique: vi.fn(),
    mockAgencyTenantFindUnique: vi.fn(),
    mockResolveActivePlan: vi.fn(),
    links, activeCount,
    add: (agencyId: string, tenantId: string) => { seq += 1; links.push({ id: `rel-${seq}`, agencyId, tenantId, status: "ACTIVE" }); return `rel-${seq}`; },
    reset: () => { links.length = 0; seq = 0; queue = Promise.resolve(); },
    serialize,
  };
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingPlan: { upsert: v.mockUpsert, findUnique: v.mockFindUnique },
    planPricingVersion: { create: v.mockVersionCreate },
    websiteAgency: { findUnique: v.mockAgencyFindUnique },
    billingSubscription: { findFirst: async () => ({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000) }) },
    agencyCapacityAddon: { aggregate: async () => ({ _sum: { quantity: null } }) },
    workspace: { findUnique: v.mockWorkspaceFindUnique },
    agencyTenant: {
      findUnique: v.mockAgencyTenantFindUnique,
      count: async ({ where }: { where: { agencyId: string; status: string } }) => v.activeCount(where.agencyId),
      update: async ({ where, data }: { where: { id: string }; data: { status?: string } }) => {
        const link = v.links.find((l) => l.id === where.id)!;
        if (data.status) link.status = data.status;
        return link;
      },
    },
    $transaction: (cb: (tx: unknown) => unknown) => v.serialize(() => cb({
      $queryRaw: async () => {},
      agencyTenant: {
        count: async ({ where }: { where: { agencyId: string; status: string } }) => v.activeCount(where.agencyId),
        create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => ({ id: v.add(data.agencyId, data.tenantId) }),
      },
    })),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));
vi.mock("@/modules/billing/infrastructure/catalog-seed", () => ({ seedBillingCatalog: vi.fn() }));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({ resetRuntimeConfigLoaderCache: v.mockResetCache }));
vi.mock("razorpay", () => ({ __esModule: true, default: class { plans = { create: v.mockPlansCreate }; } }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: v.mockResolveActivePlan }));

import { savePlanConfig } from "@/actions/super-admin-pricing.actions";
import { agencyTenantRelationship } from "@/modules/partner/application/partner-relationship";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";
import { capabilityService } from "@/lib/capabilities";

const ENTERPRISE = "partner_enterprise";
const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const t = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function baseInput(overrides: Record<string, number | boolean | string>) {
  return {
    code: ENTERPRISE, name: "Enterprise Partner", family: "partner" as const,
    description: "", targetAudience: null, monthlyPrice: 14999, annualPrice: null,
    trialDays: null, gracePeriodDays: 0, badge: null, ctaLabel: "Contact Sales",
    ctaType: "contact" as const, comparisonOrder: 99, hidden: true, enterprise: true,
    popular: false, bestValue: false, recommended: false, colorAccent: null,
    highlights: [], capabilities: [], featureOverrides: overrides, scheduled: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  v.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa", name: "A", email: "a@b.c" } });
  v.mockUpsert.mockResolvedValue({ id: "plan-1" });
  v.mockFindUnique.mockResolvedValue({ price: 14999, runtimeConfig: null });
  v.mockVersionCreate.mockResolvedValue({ id: "v1" });
  v.mockLogAction.mockResolvedValue(undefined);
  v.mockPlansCreate.mockResolvedValue({ id: "plan_rp" });

  v.reset();
  v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
  v.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  v.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws" });
  v.mockAgencyTenantFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    v.links.find((l) => l.id === where.id) ?? null,
  );
  v.mockLogAction.mockResolvedValue(undefined);
  resetRuntimeFeatureOverrides();
});

describe("RCCF-49 — Enterprise capacity configuration validation (server-authoritative)", () => {
  it("accepts -1 (unlimited)", async () => {
    const res = await savePlanConfig(baseInput({ max_clients: -1 }));
    expect(res.success).toBe(true);
    expect(v.mockUpsert).toHaveBeenCalled();
  });

  it("accepts a finite positive integer", async () => {
    const res = await savePlanConfig(baseInput({ max_clients: 25 }));
    expect(res.success).toBe(true);
    expect(v.mockUpsert).toHaveBeenCalled();
  });

  it("rejects 0, other negatives, decimals, NaN, Infinity and non-numeric strings (zero mutation)", async () => {
    for (const bad of [0, -2, 1.5, Number.NaN, Infinity]) {
      const res = await savePlanConfig(baseInput({ max_clients: bad }));
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/max_clients must be -1/i);
      expect(v.mockUpsert).not.toHaveBeenCalled();
      v.mockUpsert.mockClear();
    }
    const res = await savePlanConfig(baseInput({ max_clients: "abc" }));
    expect(res.success).toBe(false);
    expect(v.mockUpsert).not.toHaveBeenCalled();
  });

  it("non-super-admins are denied with zero mutation", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { role: "CREATOR", id: "c" } });
    const res = await savePlanConfig(baseInput({ max_clients: 25 }));
    expect(res.success).toBe(false);
    expect(v.mockUpsert).not.toHaveBeenCalled();
  });
});

describe("RCCF-49 — Enterprise finite vs unlimited enforcement", () => {
  it("-1 (unlimited) allows clients beyond any finite limit", async () => {
    v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 40; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(i) });
    expect(v.activeCount(AGENCY)).toBe(40);
  });

  it("finite 25 allows #25 and rejects #26", async () => {
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 25 });
    v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 25; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(i) });
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(26) })).rejects.toThrow(/capacity reached/i);
    expect(v.activeCount(AGENCY)).toBe(25);
  });

  it("downgrading the limit preserves existing relationships and blocks new provisioning", async () => {
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 50 });
    v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 20; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(i) });

    // Downgrade 50 → 10. Existing 20 stay ACTIVE; new provisioning is blocked.
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 10 });
    expect(v.activeCount(AGENCY)).toBe(20);
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(21) })).rejects.toThrow(/capacity reached/i);
    expect(v.activeCount(AGENCY)).toBe(20); // no clients removed

    // Restore 50 → new provisioning works again.
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 50 });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(21) });
    expect(v.activeCount(AGENCY)).toBe(21);
  });

  it("offboarding reclaims Enterprise capacity", async () => {
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 25 });
    v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 25; i++) v.add(AGENCY, t(i));
    expect(v.activeCount(AGENCY)).toBe(25);

    await agencyTenantRelationship.offboard(v.links[0].id, AGENCY);
    expect(v.activeCount(AGENCY)).toBe(24);
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(26) })).resolves.toMatchObject({ linked: true });
    expect(v.activeCount(AGENCY)).toBe(25);
  });

  it("concurrent final-slot creation never exceeds the configured limit", async () => {
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 25 });
    v.mockResolveActivePlan.mockResolvedValue({ code: ENTERPRISE, origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 24; i++) v.add(AGENCY, t(i));

    const results = await Promise.allSettled([
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(25) }),
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(26) }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as { linked?: boolean })?.linked).length;
    expect(ok).toBe(1);
    expect(v.activeCount(AGENCY)).toBe(25);
  });
});

describe("RCCF-49 — propagation to the capability layer", () => {
  it("a saved Enterprise runtime override changes capabilityService.limit", () => {
    expect(capabilityService.limit(ENTERPRISE, "max_clients")).toBe(-1); // default unlimited
    applyRuntimeFeatureOverrides(ENTERPRISE, { max_clients: 25 });
    expect(capabilityService.limit(ENTERPRISE, "max_clients")).toBe(25);
    resetRuntimeFeatureOverrides();
    expect(capabilityService.limit(ENTERPRISE, "max_clients")).toBe(-1);
  });

  it("Launch/Solo/Scale capacities are unchanged", () => {
    expect(capabilityService.limit("partner_free", "max_clients")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(15);
  });
});
