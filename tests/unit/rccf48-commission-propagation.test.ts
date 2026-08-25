import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    rules: [] as Array<Record<string, unknown>>,
    loyalty: null as { commissionPercent: number } | null,
    policyShare: null as number | null,
  };
  const commissionRows: Array<Record<string, unknown>> = [];
  const ledgerRows: Array<Record<string, unknown>> = [];
  return {
    state, commissionRows, ledgerRows,
    mockFindFirst: vi.fn(),
    mockUpdate: vi.fn(),
    mockCreate: vi.fn(),
    mockUpsertPolicy: vi.fn(),
    mockGetServerSession: vi.fn(),
    reset: () => {
      state.rules = []; state.loyalty = null; state.policyShare = null;
      commissionRows.length = 0; ledgerRows.length = 0;
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionRule: {
      findMany: async ({ orderBy }: { orderBy?: { priority: string } }) => {
        const rows = [...h.state.rules];
        if (orderBy?.priority === "asc") rows.sort((a, b) => (a.priority as number) - (b.priority as number));
        return rows;
      },
      findFirst: h.mockFindFirst,
      update: h.mockUpdate,
      create: h.mockCreate,
    },
    commissionPolicy: { findFirst: async () => (h.state.policyShare === null ? null : { agencyDefaultShare: h.state.policyShare }) },
    // RCCF-73 eligibility gate: partner is a PAID (ACTIVE) Solo agency.
    billingAccount: { findUnique: async () => ({ id: "acc-1" }) },
    billingSubscription: { findMany: async () => [{ status: "ACTIVE", plan: { code: "partner_solo", family: "partner" } }] },
    agencyTenant: { findUnique: async () => ({ agencyId: "p1", revSharePercent: 0 }) },
    workspace: { findUnique: async () => ({ tenantId: "t1" }) },
    commissionEntry: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-1", ...data }; h.commissionRows.push(r); return r; },
    },
    partnerLedger: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-1", ...data }; h.ledgerRows.push(r); return r; },
    },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      commissionEntry: { create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-tx", ...data }; h.commissionRows.push(r); return r; } },
      partnerLedger: { findFirst: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-tx", ...data }; h.ledgerRows.push(r); return r; } },
    }),
  },
}));
vi.mock("@/lib/commission/loyalty", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commission/loyalty")>("@/lib/commission/loyalty");
  return { ...actual, resolveLoyaltyTier: async () => h.state.loyalty, getActiveClientCount: async () => 0 };
});
vi.mock("@/modules/billing/infrastructure/revenue-repository", () => ({ revenueRepository: { upsertCommissionPolicy: h.mockUpsertPolicy } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revenueService } from "@/modules/billing/application/revenue-service";
import { adminUpdateCommissionConfig } from "@/actions/super-admin-billing.actions";
import { resolveSplitSource, computeSubscriptionSplit, recordSubscriptionCommission } from "@/lib/commission/runtime";
import { tierForCount } from "@/lib/commission/loyalty";

const TIERS = [
  { id: "starter", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
  { id: "growth", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
  { id: "scale", name: "Scale", minActiveClients: 25, maxActiveClients: null, commissionPercent: 50 },
];

const BASE_CONFIG = { agencyClientPercent: 0, platformPercent: 0, referralPercent: 0, creatorDefaultShare: 0, agencyDefaultShare: 30 };

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockFindFirst.mockResolvedValue(null);
  h.mockUpdate.mockResolvedValue({});
  h.mockCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "new-rule", ...data }; h.state.rules.push(r); return r; });
  h.mockUpsertPolicy.mockResolvedValue(undefined);
  h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa" } });
});
afterEach(() => vi.useRealTimers());

describe("RCCF-48 — Commission Center writes the canonical global DB CommissionRule", () => {
  it("creates a global default rule from agencyDefaultShare when none exists", async () => {
    await revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: 35 });

    expect(h.mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "default", partnerId: null, partnerSharePercent: 35, platformSharePercent: 65, status: "active" }),
    }));
    expect(h.mockUpsertPolicy).toHaveBeenCalled(); // fallback still written
  });

  it("updates the existing active global rule (deterministic upsert, no duplicate)", async () => {
    h.mockFindFirst.mockResolvedValue({ id: "r1" });

    await revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: 45 });

    expect(h.mockCreate).not.toHaveBeenCalled();
    expect(h.mockUpdate).toHaveBeenCalledWith({ where: { id: "r1" }, data: expect.objectContaining({ partnerSharePercent: 45, platformSharePercent: 55 }) });
  });

  it("rejects non-finite and out-of-range percentages (server-side)", async () => {
    await expect(revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: Number.NaN })).rejects.toThrow(/Invalid commission percentage/i);
    await expect(revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: Infinity })).rejects.toThrow(/Invalid commission percentage/i);
    await expect(revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: 101 })).rejects.toThrow(/Invalid commission percentage/i);
    await expect(revenueService.updateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: -1 })).rejects.toThrow(/Invalid commission percentage/i);
    expect(h.mockCreate).not.toHaveBeenCalled();
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });
});

describe("RCCF-48 — Commission Center action authorization", () => {
  it("SUPER_ADMIN is allowed and propagates", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa" } });
    const res = await adminUpdateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: 35 });
    expect(res.success).toBe(true);
    expect(h.mockCreate).toHaveBeenCalled();
  });

  it("CREATOR is denied with zero mutation", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { role: "CREATOR", id: "c" } });
    const res = await adminUpdateCommissionConfig({ ...BASE_CONFIG, agencyDefaultShare: 35 });
    expect(res.success).toBe(false);
    expect(h.mockCreate).not.toHaveBeenCalled();
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });
});

describe("RCCF-48 — explicit rule overrides loyalty; loyalty is the fallback", () => {
  it("a global 35% rule wins over loyalty 30% and 50%", async () => {
    h.state.rules = [{ id: "g", type: "default", partnerId: null, partnerSharePercent: 35, platformSharePercent: 65, priority: 100, effectiveFrom: new Date("2020-01-01"), status: "active" }];
    h.state.loyalty = { commissionPercent: 30 };
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(35);

    h.state.loyalty = { commissionPercent: 50 };
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(35);
  });

  it("loyalty economics are unchanged when no rule exists (30/40/50)", () => {
    expect(tierForCount(TIERS, 5)?.commissionPercent).toBe(30);
    expect(tierForCount(TIERS, 10)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 30)?.commissionPercent).toBe(50);
  });

  it("no rule + loyalty 30 → 30 (fallback path preserved)", async () => {
    h.state.loyalty = { commissionPercent: 30 };
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).source).toBe("loyalty");
  });
});

describe("RCCF-48 — effective dating + future-only + historical immutability", () => {
  it("Jan 30% and Feb 40% rules resolve deterministically by transaction date", async () => {
    h.state.rules = [
      { id: "old", type: "default", partnerId: null, partnerSharePercent: 30, platformSharePercent: 70, priority: 100, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: new Date("2026-01-31T23:59:59Z"), status: "active" },
      { id: "new", type: "default", partnerId: null, partnerSharePercent: 40, platformSharePercent: 60, priority: 100, effectiveFrom: new Date("2026-02-01T00:00:00Z"), effectiveTo: null, status: "active" },
    ];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);
    vi.setSystemTime(new Date("2026-02-15T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(40);
    vi.useRealTimers();
  });

  it("a new rule flows to future CommissionEntry while history stays at the old rate", async () => {
    h.commissionRows.push({ id: "ce-historical", invoiceId: "inv-old", partnerShare: 300, partnerPercent: 30, entryType: "subscription_created", status: "pending" });
    h.state.rules = [{ id: "g", type: "default", partnerId: null, partnerSharePercent: 35, platformSharePercent: 65, priority: 100, effectiveFrom: new Date("2020-01-01"), status: "active" }];

    await recordSubscriptionCommission({ workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-new", amount: 1000, event: "created" });

    expect(h.commissionRows.find((r) => r.id === "ce-historical")!.partnerPercent).toBe(30); // unchanged
    const created = h.commissionRows.find((r) => r.entryType === "subscription_created" && r.id !== "ce-historical");
    expect(created!.partnerPercent).toBe(35);
    expect(created!.partnerShare).toBe(350);
  });
});

describe("RCCF-48 — commission arithmetic (no rounding drift)", () => {
  it("partnerShare + platformShare = gross", () => {
    for (const gross of [1, 10, 999, 1000, 1234.56]) {
      const split = computeSubscriptionSplit(gross, { platformPercent: 65, partnerPercent: 35, ruleId: null, source: "rule" });
      expect(Math.round((split.partnerShare + split.platformShare) * 100) / 100).toBe(Math.round(gross * 100) / 100);
    }
  });
});
